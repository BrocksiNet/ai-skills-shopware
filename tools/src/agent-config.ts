// Model metadata is independent of CLI adapters and process execution.
import { basename } from 'node:path';
import { envOr } from './env.ts';

export const OPENCODE_FREE_MODEL = 'opencode/mimo-v2.6-flash-free';
export const CLAUDE_DEFAULT_MODEL = 'sonnet';
export const COPILOT_DEFAULT_MODEL = 'claude-haiku-4.5';
export const DEFAULT_MODELS: Record<string, string> = {
  opencode: OPENCODE_FREE_MODEL,
  copilot: COPILOT_DEFAULT_MODEL,
  claude: CLAUDE_DEFAULT_MODEL,
};

/** The agent column: EVAL_AGENT, else the adapter file name without `.sh`
 *  and a `-task` suffix (`opencode-task.sh` gives `opencode`). */
export function agentLabel(env: NodeJS.ProcessEnv): string {
  const agent = envOr(env, 'EVAL_AGENT', '');
  if (agent !== '') return agent.replace(/-task$/u, '');
  let label = basename((env.SKILLS_AGENT_CMD ?? '').split(' ')[0] ?? '');
  if (label.endsWith('.sh') && label !== '.sh') label = label.slice(0, -3);
  return label.replace(/-task$/u, '');
}

export const modelLabel = (env: NodeJS.ProcessEnv): string =>
  envOr(env, 'TASK_MODEL', DEFAULT_MODELS[agentLabel(env)] ?? 'default');
