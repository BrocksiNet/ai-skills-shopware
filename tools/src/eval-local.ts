// Model evals on this machine with an agent you are logged in to, then the
// CI gate (plan WP10 step 4; ported from scripts/eval-local.sh, which is now
// a wrapper and documents the environment).
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { type RunAbOptions, runAb } from './ab-run.ts';
import { envOr } from './env.ts';
import { errorMessage } from './errors.ts';
import { gate, gateOptionsFromEnv } from './eval-gate.ts';
import { plan, planOptionsFromEnv } from './eval-plan.ts';
import { parseResults } from './eval-results.ts';
import { onPath } from './proc.ts';
import { inSeries } from './series.ts';

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
  if (agent !== 'claude' && agent !== 'opencode') return 'EVAL_LOCAL_AGENT must be claude or opencode';
  if (!onPath(agent, env)) return `${agent} CLI not found`;
  const out: NodeJS.ProcessEnv = {
    ...env,
    SKILLS_AGENT_CMD: join(root, 'evals/runner', `${agent}-task.sh`),
    SKILLS_PROFILE_CMD: join(root, 'evals/runner/skills-profile.sh'),
    EVAL_AGENT: agent,
  };
  if (agent === 'claude') {
    out.TASK_MODEL = envOr(env, 'TASK_MODEL', 'haiku');
  } else {
    // Keep the throwaway HOME, but bring the user's OpenCode login.
    const data = envOr(env, 'XDG_DATA_HOME', join(envOr(env, 'HOME', ''), '.local/share'));
    out.OPENCODE_AUTH_FILE = envOr(env, 'OPENCODE_AUTH_FILE', join(data, 'opencode/auth.json'));
  }
  return out;
}

/** Plans the tasks, runs an A/B for each and returns the gate's exit code:
 *  0 pass, 1 fail, 2 when nothing could run. */
export async function evalLocal(o: EvalLocalOptions): Promise<number> {
  const env = agentEnv(o.root, o.env);
  if (typeof env === 'string') {
    o.err(`${env}\n`);
    return 2;
  }
  const repeats = envOr(env, 'REPEATS', '3');
  const results = envOr(env, 'EVAL_RESULTS', join(o.root, `evals/.results/local-${stamp(o.now ?? new Date())}.jsonl`));
  env.EVAL_RESULTS = results;
  mkdirSync(dirname(results), { recursive: true });
  let tasks: string[];
  try {
    tasks = plan(join(o.root, 'evals/tasks'), { ...planOptionsFromEnv(env), shards: 1 }).tasks;
  } catch (error) {
    o.err(`eval-plan: ${errorMessage(error)}\n`);
    return 2;
  }
  if (tasks.length === 0) {
    o.err('No tasks selected.\n');
    return 2;
  }

  o.err(`Agent ${envOr(env, 'EVAL_AGENT', '')}, model ${envOr(env, 'TASK_MODEL', 'default')}, `);
  o.err(`${tasks.length} task(s), ${repeats} repeat(s)\nResults: ${results}\n`);
  const ab = o.ab ?? runAb;
  // ab's exit code encodes the verdict; the gate decides.
  await inSeries(tasks, async (task) => {
    o.err(`== ${task}\n`);
    await ab({ root: o.root, task, repeats, env, out: o.err, err: o.err });
  });

  try {
    const records = existsSync(results) ? parseResults(readFileSync(results, 'utf8')) : [];
    const report = gate(records, gateOptionsFromEnv(env));
    o.out(`${report.markdown}\n`);
    return report.failed ? 1 : 0;
  } catch (error) {
    o.err(`eval-gate: ${errorMessage(error)}\n`);
    return 2;
  }
}
