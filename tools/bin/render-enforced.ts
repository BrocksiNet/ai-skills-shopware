// Render the "Already enforced by CI (do not repeat)" section of every
// SKILL.md, and references/enforced-by-ci.md where the list is too long,
// from rules/catalog.json (plan WP3).
//
//   node tools/bin/render-enforced.ts [repo-root]
//
// Writes the files it changes and lists them. validate-rules.ts fails when a
// section is out of date, so run this after editing `trunk.enforced_by`.
import { rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { loadCatalog } from '../src/catalog.ts';
import { enforcedChanges } from '../src/enforced-files.ts';

const root = resolve(process.argv[2] ?? resolve(import.meta.dirname, '../..'));

try {
  for (const { file, next } of enforcedChanges(root, loadCatalog(root))) {
    if (next === null) {
      rmSync(join(root, file));
      console.log(`removed ${file}`);
    } else {
      writeFileSync(join(root, file), next);
      console.log(`updated ${file}`);
    }
  }
} catch (e) {
  console.error(`render-enforced: ${(e as Error).message}`);
  process.exit(1);
}
