// Check every skills/<skill>/routes.json and its rendered table (plan WP4).
// Called from scripts/validate-skills.sh.
//
//   node tools/bin/validate-routes.ts [repo-root]
import { existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { compareText } from '../src/text.ts';
import { ROUTES_FILE, routeErrors } from '../src/routes.ts';

function main(root: string): number {
  const skills = readdirSync(join(root, 'skills')).toSorted(compareText);
  const routed = skills.filter((s) => existsSync(join(root, 'skills', s, ROUTES_FILE)));
  const errors = routed.flatMap((s) => routeErrors(join(root, 'skills', s), `skills/${s}`));

  console.log(`Routes: ${routed.length} skill(s) with ${ROUTES_FILE}`);
  if (errors.length > 0) {
    for (const e of errors) console.log(`  ERROR: ${e}`);
    console.log(`validate-routes: ${errors.length} error(s)`);
    return 1;
  }
  console.log('validate-routes: OK');
  return 0;
}

process.exitCode = main(resolve(process.argv[2] ?? resolve(import.meta.dirname, '../..')));
