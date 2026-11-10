// Model defaults and OpenCode agent settings, independent of CLI adapters and process execution.
import { basename } from 'node:path';
import { envOr } from './env.ts';

export const OPENCODE_FREE_MODEL = 'opencode/mimo-v2.6-flash-free';
export const CLAUDE_DEFAULT_MODEL = 'sonnet';
export const COPILOT_DEFAULT_MODEL = 'claude-haiku-4.5';

/** The step cap for the build agent, and no title agent: OpenCode asks the
 *  model for a session title next to the first turn. A local server that
 *  answers one request at a time (Ollama) runs the title first, and a
 *  thinking model can spend minutes on it while the task waits; hosted
 *  models pay tokens for a title nobody reads. */
export const opencodeAgents = (maxTurns: string): object => ({
  build: { steps: Number(maxTurns) },
  title: { disable: true },
});

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
