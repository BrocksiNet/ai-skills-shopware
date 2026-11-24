import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadReviewSources, loadSources } from '../src/sources.ts';

/** Old API recordings cover the four original trunk paths, before the AGENTS.md files and the November ADR. Keep their query
 * scope fixed as production adds new paths, rather than fabricating empty
 * GitHub responses for paths that were never recorded. */
export function historicalMiningRoot(root: string): string {
  const scratch = mkdtempSync(join(tmpdir(), 'mining-recorded-'));
  mkdirSync(join(scratch, 'rules'));
  symlinkSync(join(root, 'skills'), join(scratch, 'skills'));
  symlinkSync(join(root, 'rules/catalog.json'), join(scratch, 'rules/catalog.json'));
  const sources = loadSources(root);
  for (const source of sources) {
    if (source.id === 'shopware') {
      source.paths = source.paths.filter(
        (path) => !path.endsWith('AGENTS.md') && path !== 'adr/2026-11-19-remove-claude-md-bridge-files.md',
      );
    }
  }
  writeFileSync(join(scratch, 'rules/sources.json'), JSON.stringify({ sources, reviews: loadReviewSources(root) }));
  return scratch;
}
