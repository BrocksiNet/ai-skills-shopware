// Child processes for the eval runner and the agent adapters (plan WP10).
// One place for what the bash scripts did with `&`, `wait`, a watchdog
// subshell and `tee`: a timeout that reaches every process the child
// started, and no hang when a leftover background process keeps a pipe open.
import { spawn } from 'node:child_process';
import { accessSync, constants as fsConstants } from 'node:fs';
import { constants } from 'node:os';
import { delimiter, join } from 'node:path';

/** How long to read a child's output after it exited. */
const PIPE_DRAIN_MS = 1000;

export interface RunOptions {
  cwd?: string;
  env: NodeJS.ProcessEnv;
  /** Written to stdin, then closed. Without it stdin is /dev/null. */
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
  return 128 + (signal !== null ? (constants.signals[signal] ?? 0) : 0);
}

export function run(cmd: string, args: string[], o: RunOptions): Promise<RunResult> {
  const timeout = o.timeoutSeconds ?? 0;
  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      cwd: o.cwd,
      env: o.env,
      stdio: [o.input === undefined ? 'ignore' : 'pipe', 'pipe', 'pipe'],
      // Own process group, so the timeout can stop the children too.
      detached: timeout > 0,
    });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let done = false;
    child.stdout!.setEncoding('utf8').on('data', (chunk: string) => {
      stdout += chunk;
      o.onStdout?.(chunk);
    });
    child.stderr!.setEncoding('utf8').on('data', (chunk: string) => {
      stderr += chunk;
      o.onStderr?.(chunk);
    });
    if (child.stdin) {
      // A child that never reads stdin closes the pipe early; that is fine.
      child.stdin.on('error', () => {});
      child.stdin.end(o.input);
    }
    const timer =
      timeout > 0
        ? setTimeout(() => {
            timedOut = true;
            try {
              process.kill(-child.pid!, 'SIGTERM');
            } catch {
              // already gone
            }
          }, timeout * 1000)
        : undefined;
    let drain: NodeJS.Timeout | undefined;
    const finish = (status: number, extra = ''): void => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      clearTimeout(drain);
      if (extra !== '') o.onStderr?.(extra);
      resolve({ status, stdout, stderr: stderr + extra, timedOut });
    };
    child.on('error', (e) => finish(127, `${e.message}\n`));
    child.on('close', (code, signal) => finish(shellStatus(code, signal)));
    // A background process the child left behind can hold the output pipes
    // open after the child exited. Read what is there, then stop waiting.
    child.on('exit', (code, signal) => {
      drain = setTimeout(() => {
        child.stdout!.destroy();
        child.stderr!.destroy();
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
  let text = '';
  process.stdin.setEncoding('utf8');
  for await (const chunk of process.stdin) text += chunk as string;
  return text.replace(/\n+$/, '');
}
