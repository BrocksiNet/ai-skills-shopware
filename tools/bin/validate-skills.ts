// Static validation of every skill: structure, budgets, conflicts, rule IDs
// and reference routes. Runs on every push.
//
//   node tools/bin/validate-skills.ts [repo-root]
//
// Exit 0 = OK, 1 = errors.
import { resolve } from 'node:path';
import { stderr, stdout } from '../src/cli.ts';
import { validateSkills } from '../src/validate-skills.ts';

process.exitCode = validateSkills({
  root: resolve(process.argv[2] ?? resolve(import.meta.dirname, '../..')),
  out: stdout,
  err: stderr,
});
