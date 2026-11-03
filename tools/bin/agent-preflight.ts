// One tiny session through SKILLS_AGENT_CMD, so
// when the model is gone, evals.yml drops it in a minute instead of every
// shard retrying for hours.
// tools/src/agent-preflight.ts documents the behavior.
//
//   SKILLS_AGENT_CMD=evals/runner/opencode-task.sh node tools/bin/agent-preflight.ts
//
// Env: SKILLS_AGENT_CMD, TASK_MODEL, EVAL_PREFLIGHT_ATTEMPTS (default 3),
// EVAL_AGENT_RETRY_WAIT (seconds between attempts, default 60),
// EVAL_PREFLIGHT_TIMEOUT_SECONDS (default 300).
import { preflight } from '../src/agent-preflight.ts';
import { stderr, stdout } from '../src/cli.ts';

function main(): Promise<number> {
  if (process.argv.length > 2) {
    console.error('usage: agent-preflight.ts (no arguments; reads SKILLS_AGENT_CMD)');
    return Promise.resolve(2);
  }
  return preflight({ env: process.env, out: stdout, err: stderr });
}

process.exitCode = await main();
