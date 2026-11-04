// The agent adapters by name (tools/bin/adapter.ts) and the model each agent
// runs when TASK_MODEL is not set (tools/src/eval-profiles.ts).
import { copilotActivation, copilotTask } from './agents-copilot.ts';
import { type Adapter, claudeActivation, claudeTask, opencodeActivation, opencodeTask } from './agents.ts';

export const ADAPTERS: Record<string, Adapter> = {
  'opencode-task': opencodeTask,
  'claude-task': claudeTask,
  'copilot-task': copilotTask,
  'opencode-activation': opencodeActivation,
  'claude-activation': claudeActivation,
  'copilot-activation': copilotActivation,
};

export { DEFAULT_MODELS } from './agent-config.ts';
