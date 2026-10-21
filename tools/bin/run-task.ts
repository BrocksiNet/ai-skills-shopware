// Run one behavioral eval task once. evals/runner/run-task.sh is a wrapper
// for this file; its header documents the environment and exit codes.
//
//   node tools/bin/run-task.ts <task-name> [on|off]
import { resolve } from 'node:path';
import { stderr, stdout } from '../src/cli.ts';
import { RUN, runTask } from '../src/run-task.ts';

async function main(): Promise<number> {
  const [task, mode = 'on', ...rest] = process.argv.slice(2);
  if (task === undefined || task === '' || rest.length > 0) {
    console.error('usage: run-task.sh <task-name> [on|off]');
    return RUN.usage;
  }
  if (mode !== 'on' && mode !== 'off') {
    console.error('mode must be on|off');
    return RUN.usage;
  }
  const rc = await runTask({
    root: resolve(import.meta.dirname, '../..'),
    task,
    mode,
    env: process.env,
    out: stdout,
    err: stderr,
  });
  return rc;
}

process.exitCode = await main();
