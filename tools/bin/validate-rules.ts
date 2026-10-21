// Check rule IDs against rules/catalog.json. Part of validate-skills; runs
// on every push.
//
//   node tools/bin/validate-rules.ts [repo-root]
//
// Prints eval coverage per skill. Exit 0 = OK, 1 = errors.
import { resolve } from 'node:path';
import { checkRules } from '../src/check-reports.ts';
import { stderr, stdout } from '../src/cli.ts';

process.exitCode = checkRules(resolve(process.argv[2] ?? resolve(import.meta.dirname, '../..')), stdout, stderr);
