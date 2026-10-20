// Check rule IDs against rules/catalog.json. Called from
// scripts/validate-skills.sh; runs on every push.
//
//   node tools/bin/validate-rules.ts [repo-root]
//
// Prints eval coverage per skill. Exit 0 = OK, 1 = errors.
import { resolve } from 'node:path';
import { validateRules } from '../src/validate-rules.ts';

const root = resolve(process.argv[2] ?? resolve(import.meta.dirname, '../..'));

let report;
try {
  report = validateRules(root);
} catch (e) {
  console.error(`validate-rules: cannot read the catalog: ${(e as Error).message}`);
  process.exit(1);
}

const documented = report.active - report.withEval;
console.log(
  `Rules: ${report.active} active, ${report.withEval} with an eval, ${documented} documented only, ` +
    `${report.inactive} retired or superseded`,
);
for (const s of report.bySkill) console.log(`  ${s.skill}: ${s.active} active, ${s.withEval} with an eval`);

if (report.errors.length > 0) {
  for (const e of report.errors) console.log(`  ERROR: ${e}`);
  console.log(`validate-rules: ${report.errors.length} error(s)`);
  process.exit(1);
}
console.log('validate-rules: OK');
