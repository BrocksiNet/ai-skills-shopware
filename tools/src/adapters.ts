// The agent adapters by name (tools/bin/adapter.ts) and the model each agent
// runs when TASK_MODEL is not set (tools/src/eval-profiles.ts).
import { COPILOT_DEFAULT_MODEL, copilotActivation, copilotTask } from './agents-copilot.ts';
import {
  type Adapter,
  CLAUDE_DEFAULT_MODEL,
  OPENCODE_FREE_MODEL,
  claudeActivation,
  claudeTask,
  opencodeActivation,
  opencodeTask,
} from './agents.ts';

export const ADAPTERS: Record<string, Adapter> = {
  'opencode-task': opencodeTask,
  'claude-task': claudeTask,
  'copilot-task': copilotTask,
  'opencode-activation': opencodeActivation,
  'claude-activation': claudeActivation,
  'copilot-activation': copilotActivation,
};

export const DEFAULT_MODELS: Record<string, string> = {
  opencode: OPENCODE_FREE_MODEL,
  copilot: COPILOT_DEFAULT_MODEL,
  claude: CLAUDE_DEFAULT_MODEL,
};
