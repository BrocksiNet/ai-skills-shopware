// Check rule IDs against rules/catalog.json. Called from
// scripts/validate-skills.sh; runs on every push.
//
//   node tools/bin/validate-rules.ts [repo-root]
//
// Prints eval coverage per skill. Exit 0 = OK, 1 = errors.
import { resolve } from 'node:path';
import { errorMessage } from '../src/errors.ts';
import { type RulesReport, validateRules } from '../src/validate-rules.ts';

function print(report: RulesReport): number {
  const documented = report.active - report.withEval;
  console.log(
    `Rules: ${report.active} active, ${report.withEval} with an eval, ${documented} documented only, ` +
      `${report.inactive} retired or superseded`,
  );
  for (const s of report.bySkill) console.log(`  ${s.skill}: ${s.active} active, ${s.withEval} with an eval`);

  if (report.errors.length > 0) {
    for (const e of report.errors) console.log(`  ERROR: ${e}`);
    console.log(`validate-rules: ${report.errors.length} error(s)`);
    return 1;
  }
  console.log('validate-rules: OK');
  return 0;
}

function main(root: string): number {
  let report: RulesReport;
  try {
    report = validateRules(root);
  } catch (error) {
    console.error(`validate-rules: cannot read the catalog: ${errorMessage(error)}`);
    return 1;
  }
  return print(report);
}

process.exitCode = main(resolve(process.argv[2] ?? resolve(import.meta.dirname, '../..')));
