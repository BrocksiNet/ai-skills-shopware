// Check every skills/<skill>/routes.json and its rendered table (plan WP4).
// Called from scripts/validate-skills.sh.
//
//   node tools/bin/validate-routes.ts [repo-root]
import { existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { ROUTES_FILE, routeErrors } from '../src/routes.ts';

const root = resolve(process.argv[2] ?? resolve(import.meta.dirname, '../..'));
const skills = readdirSync(join(root, 'skills')).sort();
const routed = skills.filter((s) => existsSync(join(root, 'skills', s, ROUTES_FILE)));
const errors = routed.flatMap((s) => routeErrors(join(root, 'skills', s), `skills/${s}`));

console.log(`Routes: ${routed.length} skill(s) with ${ROUTES_FILE}`);
if (errors.length > 0) {
  for (const e of errors) console.log(`  ERROR: ${e}`);
  console.log(`validate-routes: ${errors.length} error(s)`);
  process.exit(1);
}
console.log('validate-routes: OK');
