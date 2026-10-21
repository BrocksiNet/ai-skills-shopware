// Run one behavioral eval task once (Layer 2; ported from
// evals/runner/run-task.sh in plan WP10 step 2).
//
// Copies the task fixture into a temp workdir, turns the skill set on or off
// for that workdir, runs the agent with the task instruction on stdin, keeps
// the transcript, removes the skill profile again, then runs grade.sh.
// The environment variables are documented in evals/runner/run-task.sh.
import { cpSync, createWriteStream, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { envInt } from './eval-results.ts';
import { run } from './proc.ts';

/** run-task exit codes. */
export const RUN = { pass: 0, fail: 1, usage: 2, noAgent: 3, agentError: 4 } as const;

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

const wait = (ms: number): Promise<void> => new Promise((done) => setTimeout(done, ms));

const isDir = (path: string): boolean => existsSync(path) && statSync(path).isDirectory();

/** The last three lines of the agent's stderr on one line, the reason we log. */
export function errorReason(stderr: string): string {
  const lines = stderr.split('\n');
  if (lines.at(-1) === '') lines.pop();
  return lines.slice(-3).join(' ').replace(/ +$/, '');
}

/** Runs a command to completion, forwarding its output. */
async function forward(cmd: string, args: string[], env: NodeJS.ProcessEnv, out: (t: string) => void, err: (t: string) => void): Promise<number> {
  return (await run(cmd, args, { env, onStdout: out, onStderr: err })).status;
}

export async function runTask(o: RunTaskOptions): Promise<number> {
  const { root, task, mode, env, out, err } = o;
  const sleep = o.sleep ?? wait;
  const taskDir = join(root, 'evals/tasks', task);
  if (task === '' || task.includes('/') || !isDir(taskDir)) {
    err(`Unknown task: ${task}\n`);
    return RUN.usage;
  }
  let retries: number;
  let retryWait: number;
  let timeout: number;
  try {
    retries = envInt(env, 'EVAL_AGENT_RETRIES', 2);
    retryWait = envInt(env, 'EVAL_AGENT_RETRY_WAIT', 60);
    timeout = envInt(env, 'EVAL_AGENT_TIMEOUT_SECONDS', 0);
  } catch (e) {
    err(`run-task: ${(e as Error).message}\n`);
    return RUN.usage;
  }

  const workdir = mkdtempSync(join(env.TMPDIR || tmpdir(), `eval-${task}.`));
  const transcript = join(workdir, '.transcript.txt');
  const keep = Boolean(env.KEEP_WORKDIR);
  if (keep) err(`workdir kept: ${workdir}\n`);

  // A fresh copy of the fixture, so a half-finished attempt never leaks into the next.
  const freshWorkdir = (): void => {
    for (const entry of readdirSync(workdir)) rmSync(join(workdir, entry), { recursive: true, force: true });
    const fixture = join(taskDir, 'fixture');
    if (isDir(fixture)) cpSync(fixture, workdir, { recursive: true, verbatimSymlinks: true });
  };

  const profile = async (which: Mode): Promise<boolean> => {
    if (env.SKILLS_PROFILE_CMD) {
      const rc = await forward(env.SKILLS_PROFILE_CMD, [which, workdir, task], env, out, err);
      if (rc !== 0) err(`profile ${which} failed\n`);
      return rc === 0;
    }
    // Legacy global hooks, run by bash with the workdir and task in the env.
    const hook = which === 'on' ? env.SKILLS_PROFILE_ON_CMD : env.SKILLS_PROFILE_OFF_CMD;
    if (!hook) return true;
    const rc = await forward('bash', ['-c', hook], { ...env, WORKDIR: workdir, TASK: task, ROOT: root }, out, err);
    if (rc !== 0) err(`profile ${which} failed\n`);
    return rc === 0;
  };

  try {
    freshWorkdir();
    if (!(await profile(mode))) return RUN.usage;
    const prompt = readFileSync(join(taskDir, 'instruction.md'), 'utf8').replace(/\n+$/, '');

    const agent = env.SKILLS_AGENT_CMD;
    if (!agent) {
      out('SKILLS_AGENT_CMD not set -> cannot run the agent. Printing the task only:\n');
      out(`----- task: ${task} (mode=${mode}) -----\n${prompt}\n----- workdir: ${workdir} (fixture copied) -----\n`);
      return RUN.noAgent;
    }

    const agentEnv = { ...env, EVAL_TASK: task };
    for (let attempt = 1; ; attempt++) {
      // The transcript is the agent's stdout, like `tee` in the bash runner.
      const file = createWriteStream(transcript);
      const agentRun = await run('bash', ['-c', agent], {
        cwd: workdir,
        env: agentEnv,
        input: prompt,
        timeoutSeconds: timeout,
        onStdout: (chunk) => {
          file.write(chunk);
          out(chunk);
        },
      });
      await new Promise<void>((done) => file.end(done));
      if (agentRun.status === 0) break;
      const reason = (agentRun.timedOut ? `timed out after ${timeout}s` : errorReason(agentRun.stderr)) || 'no detail';
      if (attempt > retries) {
        err(`----- agent error (${task}, mode=${mode}, exit ${agentRun.status}, attempt ${attempt}): ${reason}; not graded -----\n`);
        return RUN.agentError;
      }
      err(`----- agent error (${task}, mode=${mode}, attempt ${attempt}): ${reason}; retrying in ${retryWait}s -----\n`);
      await sleep(retryWait * 1000);
      freshWorkdir();
      if (!(await profile(mode))) return RUN.usage;
      // The failed attempt's skill loads and tokens do not count.
      for (const log of [env.EVAL_SKILLS_LOG, env.EVAL_USAGE_LOG]) if (log) rmSync(log, { force: true });
    }

    // Graders must see the agent's work only, not the symlinked skills.
    if (env.SKILLS_PROFILE_CMD) await forward(env.SKILLS_PROFILE_CMD, ['off', workdir, task], env, out, err);

    out(`----- grading (${task}, mode=${mode}) -----\n`);
    const graded = await forward('bash', [join(taskDir, 'grade.sh')], { ...env, WORKDIR: workdir, TRANSCRIPT: transcript }, out, err);
    return graded === 0 ? RUN.pass : RUN.fail;
  } finally {
    if (!keep) rmSync(workdir, { recursive: true, force: true });
  }
}

