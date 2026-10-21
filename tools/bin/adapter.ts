// Agent adapters for the evals. The evals/runner/<name>.sh files are
// wrappers for this file and document each adapter's environment.
//
//   node tools/bin/adapter.ts opencode-task|claude-task|opencode-activation|claude-activation < prompt
import { resolve } from 'node:path';
import { ADAPTERS } from '../src/agents.ts';
import { readStdin } from '../src/proc.ts';

const [name, ...rest] = process.argv.slice(2);
const adapter = name === undefined ? undefined : ADAPTERS[name];
if (adapter === undefined || rest.length > 0) {
  console.error(`usage: adapter.ts ${Object.keys(ADAPTERS).join('|')} < prompt`);
  process.exit(2);
}
process.exitCode = await adapter(await readStdin(), process.env, {
  out: (t) => process.stdout.write(t),
  err: (t) => process.stderr.write(t),
}, resolve(import.meta.dirname, '../..'));
