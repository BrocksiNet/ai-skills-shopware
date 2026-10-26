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

export interface RunOptions {
  cwd?: string;
  env: NodeJS.ProcessEnv;
  /** Written to stdin, then closed. Without it stdin is closed at once. */
  input?: string;
  /** 0 = no limit. On timeout the child's whole process group gets SIGTERM. */
  timeoutSeconds?: number;
  /** Called with each stdout chunk as it arrives. */
  onStdout?: (chunk: string) => void;
  /** Called with each stderr chunk as it arrives. */
  onStderr?: (chunk: string) => void;
}

export interface RunResult {
  /** Exit code like a shell reports it: 128 + signal when killed, 127 when
   *  the command could not start. */
  status: number;
  stdout: string;
  stderr: string;
  timedOut: boolean;
}

export function shellStatus(code: number | null, signal: NodeJS.Signals | null): number {
  if (code !== null) return code;
  return 128 + (signal === null ? 0 : constants.signals[signal]);
}

/** Collects a child's output stream as text, passing each chunk on. */
function collect(stream: Readable, onChunk: ((chunk: string) => void) | undefined): () => string {
  let all = '';
  stream.setEncoding('utf8').on('data', (chunk: string) => {
    all += chunk;
    onChunk?.(chunk);
  });
  return () => all;
}

/** SIGTERM to the child's process group, so its children stop too. */
function killGroup(child: ChildProcessWithoutNullStreams): void {
  if (child.pid === undefined) return;
  try {
    process.kill(-child.pid, 'SIGTERM');
  } catch {
    // already gone
  }
}

export function run(cmd: string, args: string[], o: RunOptions): Promise<RunResult> {
  const timeout = o.timeoutSeconds ?? 0;
  const child = spawn(cmd, args, {
    cwd: o.cwd,
    env: o.env,
    stdio: 'pipe',
    // Own process group, so the timeout can stop the children too.
    detached: timeout > 0,
  });
  const stdout = collect(child.stdout, o.onStdout);
  const stderr = collect(child.stderr, o.onStderr);
  // A child that never reads stdin closes the pipe early; that is fine.
  child.stdin.on('error', () => {});
  child.stdin.end(o.input);

  let timedOut = false;
  const timer =
    timeout > 0
      ? setTimeout(() => {
          timedOut = true;
          killGroup(child);
        }, timeout * 1000)
      : undefined;
  let drain: NodeJS.Timeout | undefined;
  return new Promise((resolve) => {
    let done = false;
    const finish = (status: number, extra = ''): void => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      clearTimeout(drain);
      if (extra !== '') o.onStderr?.(extra);
      resolve({ status, stdout: stdout(), stderr: stderr() + extra, timedOut });
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
