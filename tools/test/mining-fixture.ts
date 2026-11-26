import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadReviewSources, loadSources } from '../src/sources.ts';

/** Trunk paths added after the 2026-10 recordings: the recorded fixtures hold no requests for them. */
export const POST_RECORDING_TRUNK_PATHS: ReadonlySet<string> = new Set([
  'adr/2026-11-10-administration-public-api-snapshot.md',
  'adr/2026-11-19-remove-claude-md-bridge-files.md',
  'src/Administration/Resources/app/administration/technical-docs/11-code-quality/03-public-api-snapshot.md',
  'src/Administration/Resources/app/administration/eslint-rules/deprecation-rules/utils/api-markers.ts',
  'src/Administration/Resources/app/administration/eslint-rules/deprecation-rules/valid-api-markers.js',
  'src/Administration/Resources/app/administration/scripts/generate-public-api/README.md',
]);

/** Old API recordings cover the original trunk paths, before AGENTS.md and the
 *  November ADRs / public-api-snapshot paths. Keep their query scope fixed as
 *  production adds new paths, rather than fabricating empty GitHub responses
 *  for paths that were never recorded. */
export function historicalMiningRoot(root: string): string {
  const scratch = mkdtempSync(join(tmpdir(), 'mining-recorded-'));
  mkdirSync(join(scratch, 'rules'));
  symlinkSync(join(root, 'skills'), join(scratch, 'skills'));
  symlinkSync(join(root, 'rules/catalog.json'), join(scratch, 'rules/catalog.json'));
  const sources = loadSources(root);
  for (const source of sources) {
    if (source.id === 'shopware') {
      source.paths = source.paths.filter(
        (path) => !path.endsWith('AGENTS.md') && !POST_RECORDING_TRUNK_PATHS.has(path),
      );
    }
  }
  writeFileSync(join(scratch, 'rules/sources.json'), JSON.stringify({ sources, reviews: loadReviewSources(root) }));
  return scratch;
}
