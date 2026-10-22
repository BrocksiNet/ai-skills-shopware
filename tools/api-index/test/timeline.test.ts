import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Item, Snapshot } from '../src/model.ts';
import { isSnapshot, isTimeline } from '../src/store.ts';
import { compareReleases, fromRanges, itemAt, mergeSnapshots, releaseTags, toRanges } from '../src/timeline.ts';

function snapshot(ref: string, items: Item[]): Snapshot {
  return { schema: 1, generator: 'test', ref, sha: `sha-${ref}`, builtAt: '2026-10-22T00:00:00Z', failed: [], items };
}

const method = (flags: Item['flags'] = {}, signature = '(): void'): Item => ({
  id: 'php:A::run()',
  kind: 'method',
  file: 'src/A.php',
  visibility: 'public',
  signature,
  flags,
});

test('release order: by version, patch releases of older branches in place, trunk last', () => {
  const names = ['trunk', '6.6.0.0', '6.5.8.19', '6.5.10.0', '6.5.8.2'];
  assert.deepEqual(names.toSorted(compareReleases), ['6.5.8.2', '6.5.8.19', '6.5.10.0', '6.6.0.0', 'trunk']);
});

test('release tags: no release candidates, nothing before --from', () => {
  const tags = ['v6.4.20.2', 'v6.5.0.0-rc1', 'v6.5.0.0', 'v6.5.10.0', 'v6.5.9.0', 'v6.6.0.0-rc2', 'v6.6.0.0'];
  assert.deepEqual(releaseTags(tags, '6.5.0.0'), ['v6.5.0.0', 'v6.5.9.0', 'v6.5.10.0', 'v6.6.0.0']);
});

test('ranges: consecutive releases collapse, the newest end is open', () => {
  const names = ['a', 'b', 'c', 'd', 'e'];
  assert.deepEqual(toRanges([0, 1, 3, 4], names), [
    ['a', 'b'],
    ['d', null],
  ]);
  assert.deepEqual(toRanges([2], names), [['c', 'c']]);
  assert.deepEqual(
    [
      ...fromRanges(
        [
          ['b', 'c'],
          ['e', null],
        ],
        names,
      ),
    ],
    [1, 2, 4],
  );
});

test('merge: an item added later, deprecated, then removed', () => {
  const timeline = mergeSnapshots([
    snapshot('v6.6.0.0', []),
    snapshot('v6.7.0.0', [method()]),
    snapshot('v6.7.1.0', [method({ deprecated: 'v6.8.0' })]),
    snapshot('trunk', []),
  ]);
  assert.deepEqual(
    timeline.releases.map((release) => release.release),
    ['6.6.0.0', '6.7.0.0', '6.7.1.0', 'trunk'],
  );
  const [item] = timeline.items;
  assert.ok(item);
  assert.deepEqual(item.present, [['6.7.0.0', '6.7.1.0']]);
  assert.deepEqual(item.history.deprecated, [{ value: 'v6.8.0', ranges: [['6.7.1.0', '6.7.1.0']] }]);
  assert.deepEqual(item.history.signature, [{ value: '(): void', ranges: [['6.7.0.0', '6.7.1.0']] }]);
  assert.equal(itemAt(timeline, item, '6.6.0.0').present, false);
  assert.deepEqual(itemAt(timeline, item, '6.7.1.0'), {
    present: true,
    values: { deprecated: 'v6.8.0', visibility: 'public', signature: '(): void' },
  });
  assert.equal(itemAt(timeline, item, 'trunk').present, false);
});

test('merge: a signature change keeps both values with their releases', () => {
  const timeline = mergeSnapshots([
    snapshot('v6.6.0.0', [method({}, '(): void')]),
    snapshot('v6.7.0.0', [method({ internal: true }, '(int $a): void')]),
  ]);
  const [item] = timeline.items;
  assert.ok(item);
  assert.deepEqual(item.present, [['6.6.0.0', null]]);
  assert.deepEqual(item.history.signature, [
    { value: '(): void', ranges: [['6.6.0.0', '6.6.0.0']] },
    { value: '(int $a): void', ranges: [['6.7.0.0', null]] },
  ]);
  assert.deepEqual(item.history.internal, [{ value: 'true', ranges: [['6.7.0.0', null]] }]);
});

test('store guards accept what the generator writes', () => {
  const timeline = mergeSnapshots([snapshot('v6.6.0.0', [method()])]);
  assert.ok(isSnapshot(JSON.parse(JSON.stringify(snapshot('v6.6.0.0', [method()])))));
  assert.ok(isTimeline(JSON.parse(JSON.stringify(timeline))));
  assert.ok(!isTimeline({ schema: 1, releases: [], items: [{ id: 1 }] }));
});
