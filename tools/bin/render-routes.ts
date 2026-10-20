// Render the routes table in every SKILL.md that has a routes.json (plan WP4).
//
//   node tools/bin/render-routes.ts [repo-root]
//
// The table goes between the routes:start and routes:end markers, which the
// author places once. validate-routes.ts fails when a table is out of date.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { applyTable, loadRoutes } from '../src/routes.ts';

const root = resolve(process.argv[2] ?? resolve(import.meta.dirname, '../..'));
let failed = false;
for (const skill of readdirSync(join(root, 'skills')).sort()) {
  const dir = join(root, 'skills', skill);
  const routes = loadRoutes(dir);
  if (routes === null) continue;
  const path = join(dir, 'SKILL.md');
  const text = readFileSync(path, 'utf8');
  try {
    const next = applyTable(text, routes);
    if (next !== text) {
      writeFileSync(path, next);
      console.log(`updated skills/${skill}/SKILL.md`);
    }
  } catch (e) {
    console.error(`skills/${skill}/SKILL.md: ${(e as Error).message}`);
    failed = true;
  }
}
process.exit(failed ? 1 : 0);
