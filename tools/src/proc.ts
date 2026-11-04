// Child processes for the eval runner and the agent adapters (plan WP10).
// One place for what the bash scripts did with `&`, `wait`, a watchdog
// subshell and `tee`: a timeout that reaches every process the child
// started, and no hang when a leftover background process keeps a pipe open.
import { type ChildProcessWithoutNullStreams, spawn, spawnSync } from 'node:child_process';
import { accessSync, constants as fsConstants } from 'node:fs';
import { constants } from 'node:os';
import { delimiter, join } from 'node:path';
import type { Readable } from 'node:stream';
import { text as readAll } from 'node:stream/consumers';

/** How long to read a child's output after it exited. */
const PIPE_DRAIN_MS = 1000;
const TERM_GRACE_MS = 500;

export interface RunOptions {
  cwd?: string;
  env: NodeJS.ProcessEnv;
  /** Written to stdin, then closed. Without it stdin is closed at once. */
  input?: string;
  /** 0 = no limit. Timeout sends SIGTERM, then SIGKILL after a short grace period. */
  timeoutSeconds?: number;
  /** Called with each stdout chunk as it arrives. */
  onStdout?: (chunk: string) => void;
  /** Called with each stderr chunk as it arrives. */
  onStderr?: (chunk: string) => void;
  /** A terminal protocol result: allow exit grace, then stop the owned process group. */
  stopWhen?: (stdout: string) => boolean;
}

export interface RunResult {
  /** Exit code like a shell reports it: 128 + signal when killed, 127 when
   *  the command could not start. */
  status: number;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  stoppedAfterOutput?: true;
}

export function shellStatus(code: number | null, signal: NodeJS.Signals | null): number {
  if (code !== null) return code;
  return 128 + (signal === null ? 0 : constants.signals[signal]);
}

/** Collects a child's output stream as text, passing each chunk on. */
function collect(
  stream: Readable,
  onChunk: ((chunk: string) => void) | undefined,
  onCollected?: (all: string) => void,
): () => string {
  let all = '';
  stream.setEncoding('utf8').on('data', (chunk: string) => {
    all += chunk;
    onChunk?.(chunk);
    onCollected?.(all);
  });
  return () => all;
}

/** SIGTERM to the child's process group, so its children stop too. */
function killGroup(child: ChildProcessWithoutNullStreams, signal: NodeJS.Signals): void {
  if (child.pid === undefined) return;
  try {
    process.kill(-child.pid, signal);
  } catch {
    // already gone
  }
}

function deadline(child: ChildProcessWithoutNullStreams, seconds: number, expired: () => void): () => void {
  let force: NodeJS.Timeout | undefined;
  const timer =
    seconds > 0
      ? setTimeout(() => {
          expired();
          killGroup(child, 'SIGTERM');
          force = setTimeout(() => {
            killGroup(child, 'SIGKILL');
          }, TERM_GRACE_MS);
        }, seconds * 1000)
      : undefined;
  return () => {
    clearTimeout(timer);
    clearTimeout(force);
  };
}

function terminalStop(
  child: ChildProcessWithoutNullStreams,
  when: RunOptions['stopWhen'],
): { observe: (stdout: string) => void; cancel: () => void; stopped: () => boolean } {
  let recognized = false;
  let stopped = false;
  const timers: NodeJS.Timeout[] = [];
  return {
    observe(stdout: string): void {
      if (recognized || when?.(stdout) !== true) return;
      recognized = true;
      timers.push(
        setTimeout(() => {
          stopped = true;
          killGroup(child, 'SIGTERM');
          timers.push(
            setTimeout(() => {
              killGroup(child, 'SIGKILL');
            }, TERM_GRACE_MS),
          );
        }, PIPE_DRAIN_MS),
      );
    },
    cancel(): void {
      for (const timer of timers) clearTimeout(timer);
      if (stopped) killGroup(child, 'SIGKILL');
    },
    stopped: (): boolean => stopped,
  };
}

function spawnChild(cmd: string, args: string[], o: RunOptions): ChildProcessWithoutNullStreams {
  return spawn(cmd, args, {
    cwd: o.cwd,
    env: o.env,
    stdio: 'pipe',
    detached: (o.timeoutSeconds ?? 0) > 0 || o.stopWhen !== undefined,
  });
}

export function run(cmd: string, args: string[], o: RunOptions): Promise<RunResult> {
  const timeout = o.timeoutSeconds ?? 0;
  const child = spawnChild(cmd, args, o);
  const completion = terminalStop(child, o.stopWhen);
  const stdout = collect(child.stdout, o.onStdout, completion.observe);
  const stderr = collect(child.stderr, o.onStderr);
  // A child that never reads stdin closes the pipe early; that is fine.
  child.stdin.on('error', () => {});
  child.stdin.end(o.input);

  let timedOut = false;
  const cancelDeadline = deadline(child, timeout, () => {
    timedOut = true;
  });
  let drain: NodeJS.Timeout | undefined;
  return new Promise((resolve) => {
    let done = false;
    const finish = (status: number, extra = ''): void => {
      if (done) return;
      done = true;
      // The leader may have exited while descendants ignored SIGTERM.
      if (timedOut) killGroup(child, 'SIGKILL');
      cancelDeadline();
      completion.cancel();
      clearTimeout(drain);
      if (extra !== '') o.onStderr?.(extra);
      resolve({
        status,
        stdout: stdout(),
        stderr: stderr() + extra,
        timedOut,
        ...(completion.stopped() ? { stoppedAfterOutput: true } : {}),
      });
    };
    child.on('error', (error) => {
      finish(127, `${error.message}\n`);
    });
    child.on('close', (code, signal) => {
      finish(shellStatus(code, signal));
    });
    // A background process the child left behind can hold the output pipes
    // open after the child exited. Read what is there, then stop waiting.
    child.on('exit', (code, signal) => {
      drain = setTimeout(() => {
        child.stdout.destroy();
        child.stderr.destroy();
        finish(shellStatus(code, signal));
      }, PIPE_DRAIN_MS);
    });
  });
}

/** `command -v name`: true when an executable `name` is on PATH. */
export function onPath(name: string, env: NodeJS.ProcessEnv): boolean {
  for (const dir of (env.PATH ?? '').split(delimiter)) {
    if (dir === '') continue;
    try {
      accessSync(join(dir, name), fsConstants.X_OK);
      return true;
    } catch {
      // not here
    }
  }
  return false;
}

/** The last `n` lines of `text`, like `tail -n`. */
export function tail(text: string, n: number): string {
  const lines = text.split('\n');
  const trailing = lines.at(-1) === '';
  if (trailing) lines.pop();
  const kept = lines.slice(-n).join('\n');
  return kept === '' ? '' : trailing ? `${kept}\n` : kept;
}

/** All of stdin as text, with trailing newlines removed like `$(cat)`. */
export async function readStdin(): Promise<string> {
  return (await readAll(process.stdin)).replace(/\n+$/u, '');
}

/** The token of the GitHub CLI login, or '' without one. */
export function ghToken(env: NodeJS.ProcessEnv): string {
  if (!onPath('gh', env)) return '';
  const r = spawnSync('gh', ['auth', 'token'], { env, encoding: 'utf8' });
  return r.status === 0 ? r.stdout.trim() : '';
}
