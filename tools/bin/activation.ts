// Layer 1 activation evals. scripts/run-activation-evals.sh is a wrapper for
// this file and documents the environment.
//
//   node tools/bin/activation.ts
import { resolve } from 'node:path';
import { runActivation } from '../src/activation.ts';
import { stderr, stdout } from '../src/cli.ts';

process.exitCode = await runActivation({
  root: resolve(import.meta.dirname, '../..'),
  env: process.env,
  out: stdout,
  err: stderr,
});
