// Agent adapters for the evals. The evals/runner/<name>.sh files are
// wrappers for this file and document each adapter's environment.
//
//   node tools/bin/adapter.ts opencode-task|claude-task|opencode-activation|claude-activation < prompt
import { resolve } from 'node:path';
import { ADAPTERS } from '../src/agents.ts';
import { stderr, stdout } from '../src/cli.ts';
import { readStdin } from '../src/proc.ts';

async function main(): Promise<number> {
  const [name, ...rest] = process.argv.slice(2);
  const adapter = name === undefined ? undefined : ADAPTERS[name];
  if (adapter === undefined || rest.length > 0) {
    console.error(`usage: adapter.ts ${Object.keys(ADAPTERS).join('|')} < prompt`);
    return 2;
  }
  return adapter(await readStdin(), process.env, { out: stdout, err: stderr }, resolve(import.meta.dirname, '../..'));
}

process.exitCode = await main();
