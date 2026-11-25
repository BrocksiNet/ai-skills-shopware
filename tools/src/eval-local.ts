// Model evals on this machine with an agent you are logged in to, then the
// CI gate (plan WP10 step 4; ported from scripts/eval-local.sh, which is now
// a wrapper and documents the environment).
import { join, resolve } from 'node:path';
import { type RunAbOptions, runAb } from './ab-run.ts';
import { envInt, envOr } from './env.ts';
import { errorMessage } from './errors.ts';
import { gate, gateOptionsFromEnv } from './eval-gate.ts';
import { plan, planOptionsFromEnv } from './eval-plan.ts';
import { readResults } from './eval-result-file.ts';
import { type EvalManifest, freezeManifest } from './eval-experiment.ts';
import { ghToken, onPath } from './proc.ts';
import { inPool, inSeries } from './series.ts';

export interface EvalLocalOptions {
  root: string;
  env: NodeJS.ProcessEnv;
  /** The gate summary. */
  out: (text: string) => void;
  /** Progress and the A/B summaries. */
  err: (text: string) => void;
  /** Runs one A/B; tests replace it. */
  ab?: (o: RunAbOptions) => Promise<number>;
  /** The results file name stamp; tests fix it. */
  now?: Date;
}

/** `date -u +%Y%m%dT%H%M%SZ` */
export const stamp = (d: Date): string =>
  d
    .toISOString()
    .replace(/\.\d{3}Z$/u, 'Z')
    .replaceAll(/[-:]/gu, '');

/** The agent environment for EVAL_LOCAL_AGENT, or an error message. */
function agentEnv(root: string, env: NodeJS.ProcessEnv): NodeJS.ProcessEnv | string {
  const agent = envOr(env, 'EVAL_LOCAL_AGENT', 'claude');
  if (agent !== 'claude' && agent !== 'opencode' && agent !== 'copilot')
    return 'EVAL_LOCAL_AGENT must be claude, opencode or copilot';
  if (!onPath(agent, env)) return `${agent} CLI not found`;
  const out: NodeJS.ProcessEnv = {
    ...env,
    SKILLS_AGENT_CMD: join(root, 'evals/runner', `${agent}-task.sh`),
    SKILLS_PROFILE_CMD: join(root, 'evals/runner/skills-profile.sh'),
    EVAL_AGENT: agent,
  };
  if (agent === 'claude') {
    out.TASK_MODEL = envOr(env, 'TASK_MODEL', 'haiku');
  } else if (agent === 'copilot') {
    // Your Copilot seat through the GitHub CLI login, unless a token is set.
    if (envOr(env, 'COPILOT_GITHUB_TOKEN', '') === '' && envOr(env, 'GH_TOKEN', '') === '') {
      const token = ghToken(env);
      if (token === '') return 'copilot needs COPILOT_GITHUB_TOKEN, or a `gh auth login`';
      out.COPILOT_GITHUB_TOKEN = token;
    }
  } else {
    // Keep the throwaway HOME, but bring the user's OpenCode login.
    const data = envOr(env, 'XDG_DATA_HOME', join(envOr(env, 'HOME', ''), '.local/share'));
    out.OPENCODE_AUTH_FILE = envOr(env, 'OPENCODE_AUTH_FILE', join(data, 'opencode/auth.json'));
  }
  return out;
}

function prefixedWriter(
  prefix: string,
  write: (text: string) => void,
): { write: (text: string) => void; flush: () => void } {
  let buffer = '';
  return {
    write(text: string): void {
      buffer += text;
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) write(`${prefix}${line}\n`);
    },
    flush(): void {
      if (buffer !== '') {
        write(`${prefix}${buffer}\n`);
        buffer = '';
      }
    },
  };
}

async function runTasks(
  o: EvalLocalOptions,
  tasks: string[],
  repeats: string,
  env: NodeJS.ProcessEnv,
  concurrency: number,
): Promise<void> {
  const ab = o.ab ?? runAb;
  if (concurrency === 1) {
    await inSeries(tasks, async (task) => {
      o.err(`== ${task}\n`);
      await ab({ root: o.root, task, repeats, env, out: o.err, err: o.err });
    });
    return;
  }
  await inPool(tasks, concurrency, async (task) => {
    const prefixed = prefixedWriter(`[${task}] `, o.err);
    prefixed.write(`== ${task}\n`);
    try {
      await ab({ root: o.root, task, repeats, env: { ...env }, out: prefixed.write, err: prefixed.write });
    } finally {
      prefixed.flush();
    }
  });
}

interface LocalSetup {
  env: NodeJS.ProcessEnv;
  concurrency: number;
  repeats: string;
  results: string;
  tasks: string[];
  expected: EvalManifest;
}

function setupLocal(o: EvalLocalOptions): LocalSetup | string {
  const env = agentEnv(o.root, o.env);
  if (typeof env === 'string') return env;
  let concurrency: number;
  try {
    concurrency = envInt(env, 'EVAL_CONCURRENCY', 1, 1);
  } catch (error) {
    return `eval-local: ${errorMessage(error)}`;
  }
  const repeats = envOr(env, 'REPEATS', '3');
  // Absolute: the agent runs in a scratch workdir, where a relative trace or
  // usage log next to the results would not exist.
  const results = resolve(
    envOr(env, 'EVAL_RESULTS', join(o.root, `evals/.results/local-${stamp(o.now ?? new Date())}.jsonl`)),
  );
  env.EVAL_RESULTS = results;
  let tasks: string[];
  try {
    tasks = plan(join(o.root, 'evals/tasks'), { ...planOptionsFromEnv(env), shards: 1 }).tasks;
  } catch (error) {
    return `eval-plan: ${errorMessage(error)}`;
  }
  if (tasks.length === 0) return 'No tasks selected.';
  try {
    const expected = freezeManifest(o.root, results, tasks, Number(repeats), env);
    env.EVAL_EXPERIMENT_ID = expected.id;
    env.TASK_MODEL = expected.model;
    return { env, concurrency, repeats, results, tasks, expected };
  } catch (error) {
    return `eval-manifest: ${errorMessage(error)}`;
  }
}

/** Plans the tasks, runs an A/B for each and returns the gate's exit code:
 *  0 pass, 1 fail, 2 when nothing could run. */
export async function evalLocal(o: EvalLocalOptions): Promise<number> {
  const setup = setupLocal(o);
  if (typeof setup === 'string') {
    o.err(`${setup}\n`);
    return 2;
  }
  const { env, concurrency, repeats, results, tasks, expected } = setup;

  o.err(`Agent ${envOr(env, 'EVAL_AGENT', '')}, model ${envOr(env, 'TASK_MODEL', 'default')}, `);
  o.err(`${tasks.length} task(s), ${repeats} repeat(s)\nResults: ${results}\n`);
  if (concurrency > 1) o.err(`Concurrency: ${concurrency}\n`);
  // ab's exit code encodes the verdict; the gate decides.
  await runTasks(o, tasks, repeats, env, concurrency);

  try {
    const records = readResults(results);
    const report = gate(records, gateOptionsFromEnv(env), expected);
    o.out(`${report.markdown}\n`);
    return report.failed ? 1 : 0;
  } catch (error) {
    o.err(`eval-gate: ${errorMessage(error)}\n`);
    return 2;
  }
}
