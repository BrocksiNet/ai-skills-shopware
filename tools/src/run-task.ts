// Run one behavioral eval task once (Layer 2; ported from
// evals/runner/run-task.sh in plan WP10 step 2).
//
// Copies the task fixture into a temp workdir, turns the skill set on or off
// for that workdir, runs the agent with the task instruction on stdin, keeps
// the transcript, removes the skill profile again, then runs grade.sh.
// The environment variables are documented in evals/runner/run-task.sh.
import {
  cpSync,
  createWriteStream,
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { envInt, envOr } from './env.ts';
import { errorMessage } from './errors.ts';
import { run } from './proc.ts';

/** run-task exit codes. */
export const RUN = { pass: 0, fail: 1, usage: 2, noAgent: 3, agentError: 4, quota: 6 } as const;

/** What agents print when the plan's quota is used up (OpenCode free tier,
 *  Copilot premium requests, Claude and Codex plans, API credit). A retry
 *  cannot help until the quota resets, so the run stops at the first one. */
export const QUOTA_PATTERN =
  /usage limit reached|hit your (?:usage )?limit|exceeded your (?:monthly )?quota|insufficient_quota|credit balance is too low/iu;

export type Mode = 'on' | 'off';

export interface RunTaskOptions {
  root: string;
  task: string;
  mode: Mode;
  env: NodeJS.ProcessEnv;
  /** Standard output: transcript, grader output and status lines. */
  out: (text: string) => void;
  /** Standard error: agent errors, retries, profile and grader errors. */
  err: (text: string) => void;
  /** Waits between retries; tests pass a no-op. */
  sleep?: (ms: number) => Promise<void>;
}

const wait = async (ms: number): Promise<void> => {
  await delay(ms);
};

const isDir = (path: string): boolean => existsSync(path) && statSync(path).isDirectory();

/** The last three lines of the agent's stderr on one line, the reason we log. */
export function errorReason(stderr: string): string {
  const lines = stderr.split('\n');
  if (lines.at(-1) === '') lines.pop();
  return lines.slice(-3).join(' ').replace(/ +$/u, '');
}

/** Runs a command to completion, forwarding its output. */
async function forward(
  cmd: string,
  args: string[],
  env: NodeJS.ProcessEnv,
  out: (t: string) => void,
  err: (t: string) => void,
): Promise<number> {
  return (await run(cmd, args, { env, onStdout: out, onStderr: err })).status;
}

interface Retry {
  retries: number;
  retryWait: number;
  timeout: number;
}

/** The retry and timeout settings, or null after reporting a bad value. */
function retrySettings(env: NodeJS.ProcessEnv, err: (t: string) => void): Retry | null {
  try {
    return {
      retries: envInt(env, 'EVAL_AGENT_RETRIES', 2),
      retryWait: envInt(env, 'EVAL_AGENT_RETRY_WAIT', 60),
      timeout: envInt(env, 'EVAL_AGENT_TIMEOUT_SECONDS', 0),
    };
  } catch (error) {
    err(`run-task: ${errorMessage(error)}\n`);
    return null;
  }
}

/** One run of one task: the options plus the folders it works in. */
interface Job extends RunTaskOptions {
  taskDir: string;
  workdir: string;
  transcript: string;
  retry: Retry;
}

/** A fresh copy of the fixture, so a half-finished attempt never leaks into the next. */
function freshWorkdir(job: Job): void {
  for (const entry of readdirSync(job.workdir)) rmSync(join(job.workdir, entry), { recursive: true, force: true });
  const fixture = join(job.taskDir, 'fixture');
  if (isDir(fixture)) cpSync(fixture, job.workdir, { recursive: true, verbatimSymlinks: true });
}

/** Turns the skill set on or off for the workdir; false when that failed. */
async function profile(job: Job, which: Mode): Promise<boolean> {
  const { env, workdir, task, root, out, err } = job;
  const cmd = envOr(env, 'SKILLS_PROFILE_CMD', '');
  // Without a profile command: legacy global hooks, run by bash with the
  // workdir and task in the env.
  const hook = envOr(env, which === 'on' ? 'SKILLS_PROFILE_ON_CMD' : 'SKILLS_PROFILE_OFF_CMD', '');
  if (cmd === '' && hook === '') return true;
  const rc =
    cmd === ''
      ? await forward('bash', ['-c', hook], { ...env, WORKDIR: workdir, TASK: task, ROOT: root }, out, err)
      : await forward(cmd, [which, workdir, task], env, out, err);
  if (rc !== 0) err(`profile ${which} failed\n`);
  return rc === 0;
}

/** Runs the agent, retrying agent errors with a fresh workdir. Returns
 *  RUN.pass when the agent finished, RUN.quota when its quota is used up,
 *  else RUN.agentError or RUN.usage. */
async function runAgent(job: Job, agent: string, prompt: string, attempt: number): Promise<number> {
  const { task, mode, env, out, err, retry } = job;
  // The transcript is the agent's stdout, like `tee` in the bash runner.
  const file = createWriteStream(job.transcript);
  const agentRun = await run('bash', ['-c', agent], {
    cwd: job.workdir,
    env: { ...env, EVAL_TASK: task },
    input: prompt,
    timeoutSeconds: retry.timeout,
    onStdout: (chunk) => {
      file.write(chunk);
      out(chunk);
    },
  });
  await new Promise<void>((done) => {
    file.end(done);
  });
  if (agentRun.status === 0) return RUN.pass;
  const reason =
    (agentRun.timedOut ? `timed out after ${retry.timeout}s` : errorReason(agentRun.stderr)) || 'no detail';
  if (!agentRun.timedOut && QUOTA_PATTERN.test(agentRun.stderr)) {
    err(`----- agent error (${task}, mode=${mode}, attempt ${attempt}): ${reason}; quota used up, not retried -----\n`);
    return RUN.quota;
  }
  if (attempt > retry.retries) {
    err(
      `----- agent error (${task}, mode=${mode}, exit ${agentRun.status}, attempt ${attempt}): ${reason}; not graded -----\n`,
    );
    return RUN.agentError;
  }
  err(
    `----- agent error (${task}, mode=${mode}, attempt ${attempt}): ${reason}; retrying in ${retry.retryWait}s -----\n`,
  );
  await (job.sleep ?? wait)(retry.retryWait * 1000);
  freshWorkdir(job);
  if (!(await profile(job, mode))) return RUN.usage;
  // The failed attempt's skill loads and tokens do not count.
  for (const log of [envOr(env, 'EVAL_SKILLS_LOG', ''), envOr(env, 'EVAL_USAGE_LOG', '')]) {
    if (log !== '') rmSync(log, { force: true });
  }
  return runAgent(job, agent, prompt, attempt + 1);
}

/** The instruction, plus the recorded `api-facts` output when EVAL_API_FACTS
 *  is set and the task has one: the third arm of the WP11 A/B. */
export function taskPrompt(taskDir: string, env: NodeJS.ProcessEnv): string {
  const prompt = readFileSync(join(taskDir, 'instruction.md'), 'utf8').replace(/\n+$/u, '');
  const factsFile = join(taskDir, 'api-facts.txt');
  if (envOr(env, 'EVAL_API_FACTS', '') === '' || !existsSync(factsFile)) return prompt;
  const facts = readFileSync(factsFile, 'utf8').replace(/\n+$/u, '');
  return `${prompt}\n\nOutput of \`api-facts\` for this change (the public API index of Shopware):\n\n\`\`\`text\n${facts}\n\`\`\``;
}

/** Everything after the workdir exists: profile, agent, grading. */
async function runInWorkdir(job: Job): Promise<number> {
  const { task, mode, env, out, err } = job;
  freshWorkdir(job);
  if (!(await profile(job, mode))) return RUN.usage;
  const prompt = taskPrompt(job.taskDir, env);

  const agent = envOr(env, 'SKILLS_AGENT_CMD', '');
  if (agent === '') {
    out('SKILLS_AGENT_CMD not set -> cannot run the agent. Printing the task only:\n');
    out(`----- task: ${task} (mode=${mode}) -----\n${prompt}\n----- workdir: ${job.workdir} (fixture copied) -----\n`);
    return RUN.noAgent;
  }
  const agentRc = await runAgent(job, agent, prompt, 1);
  if (agentRc !== RUN.pass) return agentRc;

  // Graders must see the agent's work only, not the symlinked skills.
  const cmd = envOr(env, 'SKILLS_PROFILE_CMD', '');
  if (cmd !== '') await forward(cmd, ['off', job.workdir, task], env, out, err);

  out(`----- grading (${task}, mode=${mode}) -----\n`);
  const graded = await forward(
    'bash',
    [join(job.taskDir, 'grade.sh')],
    { ...env, WORKDIR: job.workdir, TRANSCRIPT: job.transcript },
    out,
    err,
  );
  return graded === 0 ? RUN.pass : RUN.fail;
}

export async function runTask(o: RunTaskOptions): Promise<number> {
  const taskDir = join(o.root, 'evals/tasks', o.task);
  if (o.task === '' || o.task.includes('/') || !isDir(taskDir)) {
    o.err(`Unknown task: ${o.task}\n`);
    return RUN.usage;
  }
  const retry = retrySettings(o.env, o.err);
  if (retry === null) return RUN.usage;

  const workdir = mkdtempSync(join(envOr(o.env, 'TMPDIR', tmpdir()), `eval-${o.task}.`));
  const keep = envOr(o.env, 'KEEP_WORKDIR', '') !== '';
  if (keep) o.err(`workdir kept: ${workdir}\n`);
  try {
    return await runInWorkdir({ ...o, taskDir, workdir, transcript: join(workdir, '.transcript.txt'), retry });
  } finally {
    if (!keep) rmSync(workdir, { recursive: true, force: true });
  }
}
