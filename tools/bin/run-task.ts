// Run one behavioral eval task once. evals/runner/run-task.sh is a wrapper
// for this file; its header documents the environment and exit codes.
//
//   node tools/bin/run-task.ts <task-name> [on|off]
import { resolve } from 'node:path';
import { RUN, runTask } from '../src/run-task.ts';

const [task, mode = 'on', ...rest] = process.argv.slice(2);
if (task === undefined || task === '' || rest.length > 0) {
  console.error('usage: run-task.sh <task-name> [on|off]');
  process.exit(RUN.usage);
}
if (mode !== 'on' && mode !== 'off') {
  console.error('mode must be on|off');
  process.exit(RUN.usage);
}
process.exitCode = await runTask({
  root: resolve(import.meta.dirname, '../..'),
  task,
  mode,
  env: process.env,
  out: (t) => process.stdout.write(t),
  err: (t) => process.stderr.write(t),
});
