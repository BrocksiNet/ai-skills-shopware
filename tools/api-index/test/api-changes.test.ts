import assert from 'node:assert/strict';
import { test } from 'node:test';
import { changesMarkdown, comparisons } from '../src/api-changes.ts';
import type { Item, Snapshot } from '../src/model.ts';
import { mergeSnapshots, type Timeline } from '../src/timeline.ts';

function snapshot(ref: string, items: Item[], sha = `sha-${ref}`): Snapshot {
  return { schema: 1, generator: 'test', ref, sha, builtAt: '2026-10-26T00:00:00Z', failed: [], items };
}

const route = (name: string, flags: Item['flags'] = {}): Item => ({
  id: `route:${name}`,
  kind: 'route',
  file: 'src/Controller.php',
  signature: `GET /${name}`,
  flags,
});

const V1 = snapshot('v6.7.0.0', [route('a'), route('b')]);
const V2 = snapshot('v6.7.1.0', [route('a', { deprecated: 'v6.8.0' })]);

function timeline(snapshots: Snapshot[]): Timeline {
  return mergeSnapshots(snapshots);
}

test('api-changes: a new tag against the tag before it', () => {
  const previous = timeline([V1, snapshot('trunk', [route('a')], 'trunk-1')]);
  const current = timeline([V1, V2, snapshot('trunk', [route('a')], 'trunk-1')]);
  const found = comparisons(previous, current);
  assert.deepEqual(
    found.map((c) => [c.title, c.diff.base, c.diff.head]),
    [['6.7.1.0', '6.7.0.0', '6.7.1.0']],
  );
  const text = changesMarkdown(previous, current);
  assert.match(text, /\| 6\.7\.1\.0 \| 6\.7\.0\.0 → 6\.7\.1\.0 \| 1 \| 0 \| 1 \|/u);
  assert.match(text, /<details><summary>6\.7\.1\.0: 1 breaking change without a deprecation in 6\.7\.0\.0, /u);
  assert.match(text, /BREAK removed: route:b/u);
});

test('api-changes: trunk of the previous index against trunk of the new one', () => {
  const previous = timeline([V1, snapshot('trunk', [route('a'), route('b')], 'aaaaaaaa1')]);
  const current = timeline([V1, snapshot('trunk', [route('a')], 'bbbbbbbb2')]);
  const [trunk] = comparisons(previous, current);
  assert.equal(trunk?.title, 'trunk');
  assert.equal(trunk.diff.base, 'trunk aaaaaaaa (2026-10-26)');
  assert.equal(trunk.diff.changes.length, 1);
});

test('api-changes: nothing moved, no previous index, a new generator', () => {
  const same = timeline([V1, snapshot('trunk', [route('a')], 'trunk-1')]);
  assert.match(changesMarkdown(same, same), /Trunk did not move and there is no new release tag/u);
  assert.match(changesMarkdown(undefined, same), /No previous index to compare with/u);
  const old = { ...same, generator: 'api-index/0.0.0' };
  assert.match(changesMarkdown(old, same), /The generator changed from api-index\/0\.0\.0 to api-index\//u);
});

test('api-changes: a rebuilt previous trunk hides what only the generator added', () => {
  // Last week's index had no deprecation flags; the new generator reads
  // them, and trunk did not change the route.
  const previous = {
    ...timeline([V1, snapshot('trunk', [route('a'), route('b')], 'aaaaaaaa1')]),
    generator: 'api-index/0.0.0',
  };
  const flagged = route('a', { deprecated: 'v6.8.0' });
  const current = timeline([V1, snapshot('trunk', [flagged], 'bbbbbbbb2')]);
  const noisy = changesMarkdown(previous, current);
  assert.match(noisy, /Some trunk changes below can come from the generator/u);
  assert.match(noisy, /\| trunk \| [^|]+ \| 1 \| 0 \| 1 \|/u);

  const rebuilt = snapshot('trunk', [flagged, route('b')], 'aaaaaaaa1');
  const [trunk] = comparisons(previous, current, rebuilt);
  assert.deepEqual(
    trunk?.diff.changes.map((change) => [change.kind, change.id]),
    [['removed', 'route:b']],
  );
  assert.equal(trunk.diff.base, 'trunk aaaaaaaa (2026-10-26)');
  const text = changesMarkdown(previous, current, rebuilt);
  assert.match(
    text,
    /The previous trunk was rebuilt with api-index\/[\d.]+, so the trunk changes below come from Shopware\./u,
  );
  assert.match(text, /\| trunk \| [^|]+ \| 1 \| 0 \| 0 \|/u);
});
