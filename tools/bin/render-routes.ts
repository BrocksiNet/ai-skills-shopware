// Render the routes table in every SKILL.md that has a routes.json (plan WP4).
//
//   node tools/bin/render-routes.ts [repo-root]
//
// The table goes between the routes:start and routes:end markers, which the
// author places once. validate-routes.ts fails when a table is out of date.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { errorMessage } from '../src/errors.ts';
import { compareText } from '../src/text.ts';
import { applyTable, loadRoutes } from '../src/routes.ts';

/** Rewrites the routing table of one skill; false when that failed. */
function render(root: string, skill: string): boolean {
  const dir = join(root, 'skills', skill);
  const routes = loadRoutes(dir);
  if (routes === null) return true;
  const path = join(dir, 'SKILL.md');
  const text = readFileSync(path, 'utf8');
  try {
    const next = applyTable(text, routes);
    if (next !== text) {
      writeFileSync(path, next);
      console.log(`updated skills/${skill}/SKILL.md`);
    }
    return true;
  } catch (error) {
    console.error(`skills/${skill}/SKILL.md: ${errorMessage(error)}`);
    return false;
  }
}

function main(root: string): number {
  const skills = readdirSync(join(root, 'skills')).toSorted(compareText);
  const failed = skills.filter((skill) => !render(root, skill));
  return failed.length > 0 ? 1 : 0;
}

process.exitCode = main(resolve(process.argv[2] ?? resolve(import.meta.dirname, '../..')));
