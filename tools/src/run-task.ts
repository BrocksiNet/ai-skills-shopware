// Run one behavioral eval task once (Layer 2; ported from
// evals/runner/run-task.sh in plan WP10 step 2).
//
// Copies the task fixture into a temp workdir, turns the skill set on or off
// for that workdir, runs the agent with the task instruction on stdin, keeps
// the transcript, removes the skill profile again, then runs grade.sh.
// The environment variables are documented in evals/runner/run-task.sh.
import { spawn } from 'node:child_process';
import { cpSync, createWriteStream, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { constants, tmpdir } from 'node:os';
import { join } from 'node:path';
import { envInt } from './eval-results.ts';

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

interface AgentRun {
  status: number;
  stderr: string;
  timedOut: boolean;
}

/** How long to read the agent's output after it exited. */
const PIPE_DRAIN_MS = 1000;

const wait = (ms: number): Promise<void> => new Promise((done) => setTimeout(done, ms));

const isDir = (path: string): boolean => existsSync(path) && statSync(path).isDirectory();

/** Exit status like a shell reports it: 128 + signal number when killed. */
function shellStatus(code: number | null, signal: NodeJS.Signals | null): number {
  if (code !== null) return code;
  return 128 + (signal !== null ? (constants.signals[signal] ?? 0) : 0);
}

/** The last three lines of the agent's stderr on one line, the reason we log. */
export function errorReason(stderr: string): string {
  const lines = stderr.split('\n');
  if (lines.at(-1) === '') lines.pop();
  return lines.slice(-3).join(' ').replace(/ +$/, '');
}

/** Runs `bash -c cmd` in `cwd` with `input` on stdin. Stdout goes to the
 *  transcript file and to `out`; stderr is collected. With a timeout the agent
 *  runs in its own process group, so the kill reaches every child and none
 *  keeps the output pipe open. */
function runAgent(cmd: string, cwd: string, env: NodeJS.ProcessEnv, input: string, transcript: string, out: (text: string) => void, timeoutSeconds: number): Promise<AgentRun> {
  return new Promise((resolve) => {
    const child = spawn('bash', ['-c', cmd], { cwd, env, stdio: ['pipe', 'pipe', 'pipe'], detached: timeoutSeconds > 0 });
    const file = createWriteStream(transcript);
    let stderr = '';
    let timedOut = false;
    child.stdout.setEncoding('utf8').on('data', (chunk: string) => {
      file.write(chunk);
      out(chunk);
    });
    child.stderr.setEncoding('utf8').on('data', (chunk: string) => (stderr += chunk));
    // An agent that never reads stdin closes the pipe early; that is fine.
    child.stdin.on('error', () => {});
    child.stdin.end(input);
    const timer =
      timeoutSeconds > 0
        ? setTimeout(() => {
            timedOut = true;
            try {
              process.kill(-child.pid!, 'SIGTERM');
            } catch {
              // already gone
            }
          }, timeoutSeconds * 1000)
        : undefined;
    let done = false;
    let drain: NodeJS.Timeout | undefined;
    const finish = (status: number, extra = ''): void => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      clearTimeout(drain);
      file.end(() => resolve({ status, stderr: stderr + extra, timedOut }));
    };
    child.on('error', (e) => finish(127, `${e.message}\n`));
    child.on('close', (code, signal) => finish(shellStatus(code, signal)));
    // A background process the agent left behind can hold the output pipes
    // open after the agent exited. Read what is there, then stop waiting.
    child.on('exit', (code, signal) => {
      drain = setTimeout(() => {
        child.stdout.destroy();
        child.stderr.destroy();
        finish(shellStatus(code, signal));
      }, PIPE_DRAIN_MS);
    });
  });
}

/** Runs a command to completion, forwarding its output. */
function forward(cmd: string, args: string[], env: NodeJS.ProcessEnv, out: (t: string) => void, err: (t: string) => void): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { env, stdio: ['ignore', 'pipe', 'pipe'] });
    child.stdout.setEncoding('utf8').on('data', out);
    child.stderr.setEncoding('utf8').on('data', err);
    child.on('error', (e) => {
      err(`${e.message}\n`);
      resolve(127);
    });
    child.on('close', (code, signal) => resolve(shellStatus(code, signal)));
  });
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
      const run = await runAgent(agent, workdir, agentEnv, prompt, transcript, out, timeout);
      if (run.status === 0) break;
      const reason = (run.timedOut ? `timed out after ${timeout}s` : errorReason(run.stderr)) || 'no detail';
      if (attempt > retries) {
        err(`----- agent error (${task}, mode=${mode}, exit ${run.status}, attempt ${attempt}): ${reason}; not graded -----\n`);
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

