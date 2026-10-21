// The rule ID and route checks with their printed report, shared by their
// own bins and by validate-skills.
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { errorMessage } from './errors.ts';
import { ROUTES_FILE, routeErrors } from './routes.ts';
import { compareText } from './text.ts';
import { type RulesReport, validateRules } from './validate-rules.ts';

type Write = (text: string) => void;

function printRules(report: RulesReport, out: Write): number {
  const documented = report.active - report.withEval;
  out(
    `Rules: ${report.active} active, ${report.withEval} with an eval, ${documented} documented only, ` +
      `${report.inactive} retired or superseded\n`,
  );
  for (const s of report.bySkill) out(`  ${s.skill}: ${s.active} active, ${s.withEval} with an eval\n`);

  if (report.errors.length > 0) {
    for (const e of report.errors) out(`  ERROR: ${e}\n`);
    out(`validate-rules: ${report.errors.length} error(s)\n`);
    return 1;
  }
  out('validate-rules: OK\n');
  return 0;
}

/** Inline rule IDs against rules/catalog.json. Exit 0 = OK, 1 = errors. */
export function checkRules(root: string, out: Write, err: Write): number {
  let report: RulesReport;
  try {
    report = validateRules(root);
  } catch (error) {
    err(`validate-rules: cannot read the catalog: ${errorMessage(error)}\n`);
    return 1;
  }
  return printRules(report, out);
}

/** Every skills/<skill>/routes.json and its rendered table. */
export function checkRoutes(root: string, out: Write): number {
  const skills = readdirSync(join(root, 'skills')).toSorted(compareText);
  const routed = skills.filter((s) => existsSync(join(root, 'skills', s, ROUTES_FILE)));
  const errors = routed.flatMap((s) => routeErrors(join(root, 'skills', s), `skills/${s}`));

  out(`Routes: ${routed.length} skill(s) with ${ROUTES_FILE}\n`);
  if (errors.length > 0) {
    for (const e of errors) out(`  ERROR: ${e}\n`);
    out(`validate-routes: ${errors.length} error(s)\n`);
    return 1;
  }
  out('validate-routes: OK\n');
  return 0;
}
