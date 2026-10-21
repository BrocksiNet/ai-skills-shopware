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
import { basename } from 'node:path';
import { envOr } from './env.ts';
import type { AbResult, Tokens, Verdict } from './eval-results.ts';

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
