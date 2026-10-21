// A/B ablation for one task. evals/runner/ab.sh is a wrapper for this file;
// its header documents the environment, verdicts and exit codes.
//
//   node tools/bin/ab.ts <task-name> [repeats]
import { resolve } from 'node:path';
import { runAb } from '../src/ab-run.ts';
import { stderr, stdout } from '../src/cli.ts';

async function main(): Promise<number> {
  const [task, repeats = '1', ...rest] = process.argv.slice(2);
  if (task === undefined || task === '' || rest.length > 0) {
    console.error('usage: ab.sh <task-name> [repeats]');
    return 2;
  }
  const rc = await runAb({
    root: resolve(import.meta.dirname, '../..'),
    task,
    repeats,
    env: process.env,
    out: stdout,
    err: stderr,
  });
  return rc;
}

process.exitCode = await main();
