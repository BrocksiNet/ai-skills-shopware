import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { loadCatalog } from '../src/catalog.ts';
import { mapIndex } from '../src/map-signal.ts';
import { renderReport } from '../src/mine-report.ts';
import { windowOfDays } from '../src/mine-trunk.ts';
import { loadSources } from '../src/sources.ts';
import { commitDeltas, type TrunkCommit } from '../src/trunk-deltas.ts';

const ROOT = resolve(import.meta.dirname, '../..');
const SOURCES = loadSources(ROOT);
const TRUNK = SOURCES.find((s) => s.id === 'shopware') ?? assert.fail('shopware source');
const section = (text: string, title: string): string => text.split(`## ${title}\n`)[1]?.split('\n## ')[0] ?? '';

test('watched root and Administration AGENTS guidance reaches the author-facing report', () => {
  const adminPath = 'src/Administration/Resources/app/administration/AGENTS.md';
  for (const path of ['AGENTS.md', adminPath]) assert.ok(TRUNK.paths.includes(path), path);
  const commit: TrunkCommit = {
    sha: '8e4dcd7662f7e418ad0b0abc1dbb3cadc71f202a',
    title: 'docs(agents): pluralized snippets',
    date: '2026-10-22T08:00:00Z',
    files: [
      {
        filename: 'AGENTS.md',
        status: 'modified',
        additions: 1,
        deletions: 0,
        patch: '@@ -1 +1,2 @@\n # Shopware\n+Use a distinct zero form only when its wording differs from the plural.',
      },
      {
        filename: adminPath,
        status: 'modified',
        additions: 1,
        deletions: 0,
        patch: '@@ -1 +1,2 @@\n # Administration\n+Use the Administration lint gate for new code.',
      },
    ],
  };
  const catalog = loadCatalog(ROOT);
  const result = renderReport(
    [
      {
        source: TRUNK,
        window: windowOfDays('2026-10-14', '2026-11-04'),
        head: { sha: commit.sha, date: commit.date },
        commits: [{ commit, deltas: commitDeltas(commit, TRUNK.extractor, TRUNK.paths) }],
      },
    ],
    catalog,
    mapIndex(ROOT, catalog, SOURCES),
  );
  const admin = section(result, 'sw-admin-js');
  assert.match(admin, /Use a distinct zero form only when its wording differs from the plural/u);
  assert.match(admin, /Use the Administration lint gate for new code/u);
  assert.doesNotMatch(section(result, 'Commits'), /Without a delta/u);
});
