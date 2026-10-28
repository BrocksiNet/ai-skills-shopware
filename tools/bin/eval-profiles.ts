// The model profiles of an eval run, for the evals.yml matrix.
//
//   EVAL_AGENTS=opencode,copilot node tools/bin/eval-profiles.ts
//
// Env:
//   EVAL_AGENTS  comma-separated agents: opencode, copilot, claude
//                (default opencode)
//   EVAL_MODEL   model for a single agent; empty = the agent's default
//                (tools/src/adapters.ts DEFAULT_MODELS)
//
// Prints a JSON array:
//   [{"id":"opencode","agent":"opencode","model":"opencode/mimo-v2.6-flash-free"}, ...]
// Exit 2 on an unknown agent, or a model with more than one agent.
import { evalProfilesFromEnv } from '../src/eval-profiles.ts';

function main(env: NodeJS.ProcessEnv): number {
  const profiles = evalProfilesFromEnv(env);
  if (typeof profiles === 'string') {
    console.error(`eval-profiles: ${profiles}`);
    return 2;
  }
  console.log(JSON.stringify(profiles));
  return 0;
}

process.exitCode = main(process.env);
