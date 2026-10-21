// Model evals on this machine, then the CI gate. scripts/eval-local.sh is a
// wrapper for this file and documents the environment.
//
//   node tools/bin/eval-local.ts
import { resolve } from 'node:path';
import { stderr, stdout } from '../src/cli.ts';
import { evalLocal } from '../src/eval-local.ts';

process.exitCode = await evalLocal({
  root: resolve(import.meta.dirname, '../..'),
  env: process.env,
  out: stdout,
  err: stderr,
});
