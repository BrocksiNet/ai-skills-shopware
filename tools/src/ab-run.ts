// Running an A/B (plan WP10 step 2): both modes of one task through
// runTask, then the record, the results line and the summary. The verdict
// rules and the record format are in ab.ts.
import { spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { type ModeCounts, abRecord, abSummary, agentLabel, decide, emptyCounts, loadedOneOf, sumUsage } from './ab.ts';
import { envInt, envOr, envSet } from './env.ts';
import { errorMessage } from './errors.ts';
import { repoSkills, taskSkills } from './eval-plan.ts';
import { type Mode, RUN, type RunTaskOptions, runTask } from './run-task.ts';
import { inSeries } from './series.ts';

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

export interface RunAbOptions {
  root: string;
  task: string;
  /** Runs per mode, as given on the command line. */
  repeats: string;
  env: NodeJS.ProcessEnv;
  /** The summary. */
  out: (text: string) => void;
  /** Refusals and the agent-error lines of the runs. */
  err: (text: string) => void;
  /** Runs one task once; tests replace it. */
  run?: (o: RunTaskOptions) => Promise<number>;
}

/** The reason the A/B cannot start, with its exit code, or null. */
function refusal(root: string, task: string, repeats: string, env: NodeJS.ProcessEnv): [string, number] | null {
  if (!/^[1-9][0-9]*$/u.test(repeats)) return ['repeats must be a positive integer', 2];
  const taskDir = join(root, 'evals/tasks', task);
  if (task === '' || task.includes('/') || !existsSync(taskDir) || !statSync(taskDir).isDirectory()) {
    return [`Unknown task: ${task}`, 2];
  }
  if (!envSet(env, 'SKILLS_AGENT_CMD')) return ['SKILLS_AGENT_CMD not set -> cannot run the A/B.', 3];
  if (!['SKILLS_PROFILE_CMD', 'SKILLS_PROFILE_ON_CMD', 'SKILLS_PROFILE_OFF_CMD'].some((n) => envSet(env, n))) {
    return [
      `No SKILLS_PROFILE_CMD: 'on' and 'off' would load the same skills. Refusing.\nUse: SKILLS_PROFILE_CMD=${join(root, 'evals/runner/skills-profile.sh')}`,
      2,
    ];
  }
  return null;
}

/** One A/B: runs both modes, appends the record to EVAL_RESULTS (default
 *  evals/.results/ab.jsonl), prints the summary and returns the verdict's
 *  exit code, or 2/3 when it cannot start. */
export async function runAb(o: RunAbOptions): Promise<number> {
  const { root, task, env } = o;
  const refused = refusal(root, task, o.repeats, env);
  if (refused !== null) {
    o.err(`${refused[0]}\n`);
    return refused[1];
  }
  let minDelta: number;
  try {
    minDelta = envInt(env, 'EVAL_AB_MIN_DELTA_PCT', 50);
  } catch (error) {
    o.err(`ab: ${errorMessage(error)}\n`);
    return 2;
  }
  const repeats = Number(o.repeats);
  const results = envOr(env, 'EVAL_RESULTS', join(root, 'evals/.results/ab.jsonl'));
  mkdirSync(dirname(results), { recursive: true });

  const modes: AbOptions = { root, task, repeats, env, err: o.err };
  if (o.run) modes.run = o.run;
  const { on, off } = await runModes(modes);
  const decision = decide(repeats, on, off, minDelta);
  const record = abRecord(task, repeats, on, off, decision, {
    agent: agentLabel(env),
    model: envOr(env, 'TASK_MODEL', 'default'),
    sha: shortSha(root),
    ts: new Date().toISOString().replace(/\.\d{3}Z$/u, 'Z'),
  });
  appendFileSync(results, `${JSON.stringify(record)}\n`);
  o.out(`${abSummary(record, on, off)}\n`);
  return decision.code;
}
