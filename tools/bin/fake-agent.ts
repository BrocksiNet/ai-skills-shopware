// Test double for SKILLS_AGENT_CMD; tools/src/fake-agent.ts documents the
// modes. evals/runner/fake-agent.sh is a wrapper for this file.
//
//   echo prompt | EVAL_TASK=<task> node tools/bin/fake-agent.ts
import { resolve } from 'node:path';
import { stderr, stdout } from '../src/cli.ts';
import { fakeAgent } from '../src/fake-agent.ts';
import { readStdin } from '../src/proc.ts';

async function main(): Promise<number> {
  await readStdin();
  return fakeAgent({
    root: resolve(import.meta.dirname, '../..'),
    cwd: process.cwd(),
    env: process.env,
    out: stdout,
    err: stderr,
  });
}

process.exitCode = await main();
