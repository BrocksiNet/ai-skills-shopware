// Layer 3: A/B ablation for one task (ported from evals/runner/ab.sh in plan
// WP10 step 2). Runs the task with the skill set on and off, appends one JSON
// line to the results file and prints a short summary.
//
// Pass rates count completed runs only; an agent error is not a failed task.
// A gap smaller than the min delta (EVAL_AB_MIN_DELTA_PCT, default 50 points)
// is noise: with 3 repeats one run is 33 points, so "improved" and "worse"
// need two runs.
//
// Verdicts and exit codes:
//   improved       on rate - off rate >= min delta   0
//   held           every completed run passed        11
//   no_difference  gap below the min delta           10
//   worse          off rate - on rate >= min delta   20
//   error          fewer than half of the runs of a
//                  mode completed                    5
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { envOr } from './env.ts';
import type { AbResult, Tokens, Verdict } from './eval-results.ts';
import { repoSkills, taskSkills } from './eval-plan.ts';
import { type Mode, RUN, type RunTaskOptions, runTask } from './run-task.ts';
import { inSeries } from './series.ts';

export const AB_EXIT: Record<Verdict, number> = { improved: 0, held: 11, no_difference: 10, worse: 20, error: 5 };

/** What the runs of one mode produced. */
export interface ModeCounts {
  pass: number;
  /** Agent errors: runs that ended with anything but a graded pass or fail. */
  err: number;
  /** Runs whose skills log matched. */
  loaded: number;
  /** Runs whose adapter wrote a skills log at all. */
  reported: number;
  tokensIn: number;
  tokensOut: number;
  /** Completed runs that reported tokens. */
  tokenRuns: number;
}

export const emptyCounts = (): ModeCounts => ({
  pass: 0,
  err: 0,
  loaded: 0,
  reported: 0,
  tokensIn: 0,
  tokensOut: 0,
  tokenRuns: 0,
});

/** Average tokens per run, rounded half up, or null when no run reported. */
export function tokensAverage(c: ModeCounts): Tokens | null {
  if (c.tokenRuns === 0) return null;
  const avg = (sum: number): number => Math.floor((sum + Math.floor(c.tokenRuns / 2)) / c.tokenRuns);
  return { input: avg(c.tokensIn), output: avg(c.tokensOut), runs: c.tokenRuns };
}

/** A field the way awk reads a number: its numeric prefix, else 0. */
function awkNumber(field: string | undefined): number {
  const prefix = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/iu.exec(field ?? '');
  return prefix === null ? 0 : Number(prefix[0]);
}

/** Sum of the "<input> <output>" lines an adapter writes to EVAL_USAGE_LOG.
 *  Like awk, a field that is not a number counts as its numeric prefix or 0. */
export function sumUsage(text: string): [number, number] {
  let input = 0;
  let output = 0;
  for (const line of text.split('\n')) {
    const [a, b] = line.trim().split(/\s+/u);
    input += awkNumber(a);
    output += awkNumber(b);
  }
  return [Math.trunc(input), Math.trunc(output)];
}

/** True when a line of the skills log is exactly one of `skills`. */
export function loadedOneOf(log: string, skills: string[]): boolean {
  const wanted = new Set(skills);
  return log.split('\n').some((line) => wanted.has(line));
}

export interface Decision {
  verdict: Verdict;
  code: number;
  onDone: number;
  offDone: number;
}

const rate = (pass: number, done: number): number => Math.trunc((pass * 100) / done);

export function decide(repeats: number, on: ModeCounts, off: ModeCounts, minDelta: number): Decision {
  const onDone = repeats - on.err;
  const offDone = repeats - off.err;
  const enough = onDone * 2 >= repeats && offDone * 2 >= repeats && onDone > 0 && offDone > 0;
  const gap = enough ? rate(on.pass, onDone) - rate(off.pass, offDone) : 0;
  let verdict: Verdict;
  if (!enough) verdict = 'error';
  else if (gap >= minDelta) verdict = 'improved';
  else if (gap <= -minDelta) verdict = 'worse';
  else if (on.pass === onDone && off.pass === offDone) verdict = 'held';
  else verdict = 'no_difference';
  return { verdict, code: AB_EXIT[verdict], onDone, offDone };
}

/** The agent column: EVAL_AGENT, else the adapter file name without `.sh`
 *  and a `-task` suffix (`opencode-task.sh` gives `opencode`). */
export function agentLabel(env: NodeJS.ProcessEnv): string {
  const agent = envOr(env, 'EVAL_AGENT', '');
  if (agent !== '') return agent.replace(/-task$/u, '');
  let label = basename((env.SKILLS_AGENT_CMD ?? '').split(' ')[0] ?? '');
  if (label.endsWith('.sh') && label !== '.sh') label = label.slice(0, -3);
  return label.replace(/-task$/u, '');
}

export interface RecordMeta {
  agent: string;
  model: string;
  sha: string;
  ts: string;
}

/** One results line, fields in the order ab.sh always wrote them. */
export function abRecord(
  task: string,
  repeats: number,
  on: ModeCounts,
  off: ModeCounts,
  d: Decision,
  meta: RecordMeta,
): AbResult {
  return {
    task,
    repeats,
    on: on.pass,
    off: off.pass,
    on_done: d.onDone,
    off_done: d.offDone,
    errors: on.err + off.err,
    delta: on.pass - off.pass,
    verdict: d.verdict,
    loaded_on: on.reported > 0 ? on.loaded : null,
    loaded_off: off.reported > 0 ? off.loaded : null,
    tokens_on: tokensAverage(on),
    tokens_off: tokensAverage(off),
    agent: meta.agent,
    model: meta.model,
    sha: meta.sha,
    ts: meta.ts,
  };
}

const VERDICT_TEXT: Record<Verdict, string> = {
  improved: 'skill IMPROVES the result (earns its budget).',
  held: 'both pass every run. The model may not need this rule.',
  no_difference: 'no measurable difference. Re-examine whether this rule is needed/tested.',
  worse: 'skill made it WORSE. Investigate immediately.',
  error: '',
};

const tokenText = (t: Tokens | null | undefined): string => (t ? `${t.input}/${t.output}` : 'n/a');

export function abSummary(r: AbResult, on: ModeCounts, off: ModeCounts): string {
  const last =
    r.verdict === 'error'
      ? `too many agent errors (${r.errors ?? 0}); no verdict. Rerun once the provider is available.`
      : VERDICT_TEXT[r.verdict];
  return [
    `Task: ${r.task}  (repeats=${r.repeats})`,
    `  skill ON : ${r.on}/${r.on_done} completed runs passed (${on.err} agent error(s))`,
    `  skill OFF: ${r.off}/${r.off_done} completed runs passed (${off.err} agent error(s))`,
    `  skill loaded: on ${r.loaded_on ?? 'null'}/${r.repeats}, off ${r.loaded_off ?? 'null'}/${r.repeats}`,
    `  tokens per run (input/output): on ${tokenText(r.tokens_on)}, off ${tokenText(r.tokens_off)}`,
    `  => ${last}`,
  ].join('\n');
}

export function shortSha(root: string): string {
  const r = spawnSync('git', ['-C', root, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' });
  return r.status === 0 ? r.stdout.trim() : 'unknown';
}

export interface AbOptions {
  root: string;
  task: string;
  repeats: number;
  env: NodeJS.ProcessEnv;
  /** Agent-error lines from the runs (stderr). */
  err: (text: string) => void;
  /** Runs one task once; tests replace it. */
  run?: (o: RunTaskOptions) => Promise<number>;
  sleep?: (ms: number) => Promise<void>;
}

/** What one run left behind. */
interface RunOutcome {
  rc: number;
  /** Summed "<input> <output>" usage, or null when none was logged. */
  usage: [number, number] | null;
  /** The skills log, or null when the adapter wrote none. */
  skillsLog: string | null;
}

const readIfAny = (path: string): string | null => (existsSync(path) ? readFileSync(path, 'utf8') : null);

async function runOnce(o: AbOptions, mode: Mode, logs: string, i: number): Promise<RunOutcome> {
  const run = o.run ?? runTask;
  const skillsLog = join(logs, `${mode}-${i}`);
  const usageLog = `${skillsLog}.usage`;
  let stderr = '';
  const opts: RunTaskOptions = {
    root: o.root,
    task: o.task,
    mode,
    env: { ...o.env, EVAL_SKILLS_LOG: skillsLog, EVAL_USAGE_LOG: usageLog },
    out: () => {},
    err: (t) => {
      stderr += t;
    },
  };
  if (o.sleep) opts.sleep = o.sleep;
  const rc = await run(opts);
  // Agent errors and retries go to stderr (CI log); stdout stays the summary.
  for (const line of stderr.split('\n')) if (line.includes('----- agent error')) o.err(`${line}\n`);
  const usage = existsSync(usageLog) && statSync(usageLog).size > 0 ? sumUsage(readFileSync(usageLog, 'utf8')) : null;
  return { rc, usage, skillsLog: readIfAny(skillsLog) };
}

function addOutcome(c: ModeCounts, run: RunOutcome, match: string[]): void {
  if (run.rc === RUN.pass) c.pass++;
  else if (run.rc !== RUN.fail) c.err++;
  // Tokens of completed runs only; an agent error says nothing about the skill.
  if (run.rc <= RUN.fail && run.usage !== null) {
    c.tokensIn += run.usage[0];
    c.tokensOut += run.usage[1];
    c.tokenRuns++;
  }
  if (run.skillsLog !== null) {
    c.reported++;
    if (loadedOneOf(run.skillsLog, match)) c.loaded++;
  }
}

/** Runs every "on" repeat, then every "off" repeat, and counts what happened.
 *  Each run gets its own EVAL_SKILLS_LOG and EVAL_USAGE_LOG file. A skill-on
 *  run counts as loaded when it loaded one of the task's skills (its `skills`
 *  file, else all); a skill-off run when it loaded any repo skill, which means
 *  skills leaked into the baseline. */
export async function runModes(o: AbOptions): Promise<{ on: ModeCounts; off: ModeCounts }> {
  const all = repoSkills(o.root);
  const own = existsSync(join(o.root, 'evals/tasks', o.task, 'skills'))
    ? taskSkills(join(o.root, 'evals/tasks'), o.task)
    : all;
  const logs = mkdtempSync(join(envOr(o.env, 'TMPDIR', tmpdir()), 'ab-skills.'));
  try {
    const counts = { on: emptyCounts(), off: emptyCounts() };
    const runs = (['on', 'off'] as const satisfies readonly Mode[]).flatMap((mode) =>
      Array.from({ length: o.repeats }, (_, k) => ({ mode, i: k + 1 })),
    );
    await inSeries(runs, async ({ mode, i }) => {
      addOutcome(counts[mode], await runOnce(o, mode, logs, i), mode === 'on' ? own : all);
    });
    return counts;
  } finally {
    rmSync(logs, { recursive: true, force: true });
  }
}
