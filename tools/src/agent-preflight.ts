// One tiny session through SKILLS_AGENT_CMD before the eval shards start.
//
// Free OpenCode models come and go. When the configured model is gone,
// every session is an agent error, each shard retries for hours and the
// gate only says "agent errors". The preflight fails the run in a minute,
// with the reason and where to pick another model.
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { envInt, envOr } from './env.ts';
import { errorMessage } from './errors.ts';
import { run } from './proc.ts';
import { errorReason } from './run-task.ts';

const wait = async (ms: number): Promise<void> => {
  await delay(ms);
};

export const PREFLIGHT_PROMPT = 'Reply with the single word OK. Do not use any tools.';

export interface PreflightOptions {
  env: NodeJS.ProcessEnv;
  out: (text: string) => void;
  err: (text: string) => void;
  /** Waits between attempts; tests pass a no-op. */
  sleep?: (ms: number) => Promise<void>;
}

interface Settings {
  agent: string;
  attempts: number;
  waitSeconds: number;
  timeout: number;
}

/** The settings, or an error message. */
function settings(env: NodeJS.ProcessEnv): Settings | string {
  const agent = envOr(env, 'SKILLS_AGENT_CMD', '');
  if (agent === '') return 'SKILLS_AGENT_CMD not set';
  try {
    return {
      agent,
      attempts: envInt(env, 'EVAL_PREFLIGHT_ATTEMPTS', 3, 1),
      waitSeconds: envInt(env, 'EVAL_AGENT_RETRY_WAIT', 60),
      timeout: envInt(env, 'EVAL_PREFLIGHT_TIMEOUT_SECONDS', 300),
    };
  } catch (error) {
    return errorMessage(error);
  }
}

/** 0 when the agent finished one session, 1 when every attempt failed,
 *  2 on a usage error. */
export async function preflight(o: PreflightOptions): Promise<number> {
  const { env, out, err } = o;
  const s = settings(env);
  if (typeof s === 'string') {
    err(`agent-preflight: ${s}\n`);
    return 2;
  }
  const { agent, attempts, waitSeconds, timeout } = s;
  const model = envOr(env, 'TASK_MODEL', 'the default model');

  /** One session in a fresh empty dir; null when it finished, else why not. */
  const session = async (): Promise<string | null> => {
    const workdir = mkdtempSync(join(envOr(env, 'TMPDIR', tmpdir()), 'eval-preflight.'));
    try {
      const r = await run('bash', ['-c', agent], {
        cwd: workdir,
        env: { ...env, EVAL_TASK: 'preflight', EVAL_SKILLS_LOG: '', EVAL_USAGE_LOG: '' },
        input: PREFLIGHT_PROMPT,
        timeoutSeconds: timeout,
      });
      if (r.status === 0) return null;
      return (r.timedOut ? `timed out after ${timeout}s` : errorReason(r.stderr)) || `exit ${r.status}`;
    } finally {
      rmSync(workdir, { recursive: true, force: true });
    }
  };

  /** Attempts `attempt` to `attempts`, one after another. */
  const attemptFrom = async (attempt: number): Promise<boolean> => {
    const reason = await session();
    if (reason === null) {
      out(`agent-preflight: ${model} answered (attempt ${attempt})\n`);
      return true;
    }
    err(`agent-preflight: attempt ${attempt}/${attempts} with ${model} failed: ${reason}\n`);
    if (attempt >= attempts) return false;
    await (o.sleep ?? wait)(waitSeconds * 1000);
    return attemptFrom(attempt + 1);
  };

  if (await attemptFrom(1)) return 0;
  err(
    `agent-preflight: ${model} did not answer. Free OpenCode models come and go: list the current ones with ` +
      '`opencode models --standalone`, then pass another one with the `model` input or change the default in ' +
      '.github/workflows/evals.yml and tools/src/agents.ts.\n',
  );
  return 1;
}
