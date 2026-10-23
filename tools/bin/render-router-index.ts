// Write skills/sw-skill-router/index.json from every skill's metadata and
// routes.json. validate-skills fails when the file is out of date.
//
//   node tools/bin/render-router-index.ts [repo-root]
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { stderr, stdout } from '../src/cli.ts';
import { buildIndex, INDEX_FILE, renderIndex, routerErrors } from '../src/router-index.ts';

function main(root: string): number {
  const path = join(root, INDEX_FILE);
  const metadata = routerErrors(root).filter((e) => e.includes('metadata'));
  if (metadata.length > 0) {
    for (const e of metadata) stderr(`${e}\n`);
    return 1;
  }
  const next = renderIndex(buildIndex(root));
  let current = '';
  try {
    current = readFileSync(path, 'utf8');
  } catch {
    current = '';
  }
  if (current !== next) {
    writeFileSync(path, next);
    stdout(`updated ${INDEX_FILE}\n`);
  }
  return 0;
}

process.exitCode = main(resolve(process.argv[2] ?? resolve(import.meta.dirname, '../..')));
