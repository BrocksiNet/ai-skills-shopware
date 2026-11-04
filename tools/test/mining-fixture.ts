import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadReviewSources, loadSources } from '../src/sources.ts';

/** Old API recordings cover the four original trunk paths. Keep their query
 * scope fixed as production adds new paths, rather than fabricating empty
 * GitHub responses for paths that were never recorded. */
export function historicalMiningRoot(root: string): string {
  const scratch = mkdtempSync(join(tmpdir(), 'mining-recorded-'));
  mkdirSync(join(scratch, 'rules'));
  symlinkSync(join(root, 'skills'), join(scratch, 'skills'));
  symlinkSync(join(root, 'rules/catalog.json'), join(scratch, 'rules/catalog.json'));
  const sources = loadSources(root);
  for (const source of sources) {
    if (source.id === 'shopware') source.paths = source.paths.filter((path) => !path.endsWith('AGENTS.md'));
  }
  writeFileSync(join(scratch, 'rules/sources.json'), JSON.stringify({ sources, reviews: loadReviewSources(root) }));
  return scratch;
}
