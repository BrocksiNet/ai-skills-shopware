// Golden tests for every grade.sh; tools/src/test-graders.ts documents the
// cases. evals/test-graders.sh is a wrapper for this file.
//
//   node tools/bin/test-graders.ts [task ...]
//
// Exit 0 = OK, 1 = failures, 2 = AST tools not installed.
import { resolve } from 'node:path';
import { stderr, stdout } from '../src/cli.ts';
import { testGraders } from '../src/test-graders.ts';

process.exitCode = await testGraders({
  root: resolve(import.meta.dirname, '../..'),
  tasks: process.argv.slice(2),
  env: process.env,
  out: stdout,
  err: stderr,
});
