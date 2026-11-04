// Running an A/B (plan WP10 step 2): both modes of one task through
// runTask, then the record, the results line and the summary. The verdict
// rules and the record format are in ab.ts.
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import {
  type AbTrial,
  type ModeCounts,
  abRecord,
  abSummary,
  agentLabel,
  decide,
  emptyCounts,
  loadedOneOf,
  modelLabel,
  sumUsage,
} from './ab.ts';
import { envInt, envOr, envSet } from './env.ts';
import { errorMessage } from './errors.ts';
import { repoSkills, taskSkills } from './eval-plan.ts';
import { shortSha, startEvidence } from './eval-provenance.ts';
import { type Mode, RUN, type RunTaskOptions, runTask } from './run-task.ts';
import { inSeries } from './series.ts';

export { shortSha } from './eval-provenance.ts';

/** Where the A/B appends its record: EVAL_RESULTS, else evals/.results/ab.jsonl. */
export const resultsPath = (root: string, env: NodeJS.ProcessEnv): string =>
  envOr(env, 'EVAL_RESULTS', join(root, 'evals/.results/ab.jsonl'));

/** Written next to the results once an agent's quota is used up. Every later
 *  run that writes to the same results skips the agent, so a CI shard or a
 *  local run ends in minutes instead of retrying for hours. */
export const quotaMark = (root: string, env: NodeJS.ProcessEnv): string => `${resultsPath(root, env)}.quota`;

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
  artifacts?: string;
  random?: () => number;
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
  let stdout = '';
  const opts: RunTaskOptions = {
    root: o.root,
    task: o.task,
    mode,
    env: { ...o.env, EVAL_SKILLS_LOG: skillsLog, EVAL_USAGE_LOG: usageLog, EVAL_TRACE_LOG: `${skillsLog}.trace.jsonl` },
    out: (t) => {
      if (o.artifacts !== undefined) stdout += t;
    },
    err: (t) => {
      stderr += t;
    },
  };
  if (o.sleep) opts.sleep = o.sleep;
  const rc = await run(opts);
  if (o.artifacts !== undefined) {
    writeFileSync(join(o.artifacts, `${mode}-${i}.stdout.txt`), stdout);
    writeFileSync(join(o.artifacts, `${mode}-${i}.stderr.txt`), stderr);
  }
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

function trialOutcome(mode: Mode, repeat: number, outcome: RunOutcome | null, started: number): AbTrial {
  return {
    mode,
    repeat,
    status:
      outcome === null ? 'skipped' : outcome.rc === RUN.pass ? 'pass' : outcome.rc === RUN.fail ? 'fail' : 'error',
    exit_code: outcome?.rc ?? RUN.quota,
    duration_ms: outcome === null ? 0 : Date.now() - started,
    skills:
      outcome?.skillsLog === null || outcome === null ? null : outcome.skillsLog.split('\n').filter((s) => s !== ''),
    tokens:
      outcome?.usage === null || outcome === null
        ? null
        : { input: outcome.usage[0], output: outcome.usage[1], runs: 1 },
  };
}

function saveTrial(o: AbOptions, logs: string, trials: AbTrial[], trial: AbTrial): void {
  trials.push(trial);
  if (o.artifacts !== undefined) appendFileSync(join(logs, 'trials.jsonl'), `${JSON.stringify(trial)}\n`);
}

/** Balanced blocks put one trial of each mode together, in random order.
 *  Each run gets its own EVAL_SKILLS_LOG and EVAL_USAGE_LOG file. A skill-on
 *  run counts as loaded when it loaded one of the task's skills (its `skills`
 *  file, else all); a skill-off run when it loaded any repo skill, which means
 *  skills leaked into the baseline. */
export async function runModes(o: AbOptions): Promise<{ on: ModeCounts; off: ModeCounts; trials: AbTrial[] }> {
  const all = repoSkills(o.root);
  const own = existsSync(join(o.root, 'evals/tasks', o.task, 'skills'))
    ? taskSkills(join(o.root, 'evals/tasks'), o.task)
    : all;
  const logs = o.artifacts ?? mkdtempSync(join(envOr(o.env, 'TMPDIR', tmpdir()), 'ab-skills.'));
  mkdirSync(logs, { recursive: true });
  try {
    const counts = { on: emptyCounts(), off: emptyCounts() };
    const trials: AbTrial[] = [];
    const mark = quotaMark(o.root, o.env);
    let quota = existsSync(mark);
    if (quota) o.err(`ab: ${o.task} skipped, the agent's quota ran out earlier (delete ${mark} to retry)\n`);
    const runs = Array.from({ length: o.repeats }, (_, k) => {
      const modes: Mode[] = (o.random ?? Math.random)() < 0.5 ? ['on', 'off'] : ['off', 'on'];
      return modes.map((mode) => ({ mode, i: k + 1 }));
    }).flat();
    await inSeries(runs, async ({ mode, i }) => {
      // A skipped run is an agent error: the record says "error", not "worse".
      if (quota) {
        counts[mode].err++;
        saveTrial(o, logs, trials, trialOutcome(mode, i, null, 0));
        return;
      }
      const started = Date.now();
      const outcome = await runOnce(o, mode, logs, i);
      addOutcome(counts[mode], outcome, mode === 'on' ? own : all);
      saveTrial(o, logs, trials, trialOutcome(mode, i, outcome, started));
      if (outcome.rc !== RUN.quota) return;
      quota = true;
      mkdirSync(dirname(mark), { recursive: true });
      writeFileSync(mark, `${o.task} ${mode} ${i}\n`);
      o.err(`ab: the agent's quota is used up; skipping every later run (delete ${mark} to retry)\n`);
    });
    return { ...counts, trials };
  } finally {
    if (o.artifacts === undefined) rmSync(logs, { recursive: true, force: true });
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
  const results = resultsPath(root, env);
  mkdirSync(dirname(results), { recursive: true });
  const { runId, artifacts, snapshot } = startEvidence(root, task, `${results}.artifacts`, env);
  const modes: AbOptions = { root, task, repeats, env, err: o.err, artifacts };
  if (o.run) modes.run = o.run;
  const { on, off, trials } = await runModes(modes);
  const decision = decide(repeats, on, off, minDelta);
  const record = abRecord(task, repeats, on, off, decision, {
    agent: agentLabel(env),
    model: modelLabel(env),
    sha: shortSha(root),
    ts: new Date().toISOString().replace(/\.\d{3}Z$/u, 'Z'),
  });
  Object.assign(record, snapshot, { run_id: runId, artifacts: relative(dirname(results), artifacts), trials });
  if (envSet(env, 'EVAL_EXPERIMENT_ID')) record.experiment_id = envOr(env, 'EVAL_EXPERIMENT_ID', '');
  appendFileSync(results, `${JSON.stringify(record)}\n`);
  o.out(`${abSummary(record, on, off)}\n`);
  return decision.code;
}
