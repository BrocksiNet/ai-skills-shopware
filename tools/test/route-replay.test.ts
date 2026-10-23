// Route replay (src/route-replay.ts): the router on recorded real PRs from
// evals/routing-replay/, offline. Floors are what the corpus measured when
// it was recorded (2026-10-23); a route change that drops below them lost
// references a review comment needed. Re-record with
// `node tools/bin/replay-routes.ts --record evals/routing-replay --pr N`.
import assert from 'node:assert/strict';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { readCorpus } from '../src/replay-corpus.ts';
import { filesToDiff, touchesTests, trimDiff } from '../src/replay-diff.ts';
import { ownerKey, replayCase, selectedKeys, summarize } from '../src/route-replay.ts';
import { parseDiff } from '../src/routes.ts';

const root = resolve(import.meta.dirname, '../..');
const cases = readCorpus(join(root, 'evals/routing-replay'));
const result = summarize(cases.map((c) => replayCase(root, c)));

/** Measured on the corpus: 72 of 94 comment-mapped pairs. The misses are
 *  comments whose code left the merged diff after the review. */
const RECALL_FLOOR = 0.76;
/** Measured 4.29 references per PR; a route that fires on everything
 *  shows up here first. */
const SELECTED_CEILING = 5;

test('the corpus has the known REV-034 and REV-035 cases', () => {
  assert.ok(cases.length >= 30, `found ${cases.length}`);
  for (const pr of [19917, 20855])
    assert.ok(
      cases.some((c) => c.pr === pr && c.labels.length > 0),
      `#${pr}`,
    );
});

test('recall over comment-mapped references stays above the floor', () => {
  assert.ok(result.recall >= RECALL_FLOOR, `recall ${result.recall.toFixed(3)} (${result.hits}/${result.expected})`);
});

test('noise stays below the ceiling', () => {
  assert.ok(result.meanSelected <= SELECTED_CEILING, `selected per PR ${result.meanSelected.toFixed(2)}`);
});

test('every hand-labelled comment gets its reference', () => {
  const missed = result.cases.flatMap((c) => c.labelMisses.map((l) => `#${c.pr} ${l.rule ?? ''} ${l.reference}`));
  assert.deepEqual(missed, []);
});

test('ownerKey files a borrowed reference under its owner', () => {
  assert.equal(
    ownerKey('sw-extension-review', '../sw-review-learnings/references/code-comments.md'),
    'sw-review-learnings/references/code-comments.md',
  );
  assert.equal(ownerKey('sw-testing', 'references/unit.md'), 'sw-testing/references/unit.md');
});

test('filesToDiff builds a diff parseDiff reads, renames and files without a patch included', () => {
  const diff = filesToDiff([
    { filename: 'src/A.php', status: 'modified', patch: '@@ -1 +1 @@\n-old\n+new' },
    { filename: 'src/B.php', previous_filename: 'src/Old.php', status: 'renamed' },
    { filename: 'src/C.png', status: 'added' },
    { filename: 'src/D.php', status: 'removed', patch: '@@ -1 +0,0 @@\n-gone' },
  ]);
  assert.deepEqual(parseDiff(diff), [
    { path: 'src/A.php', lines: ['old', 'new'] },
    { path: 'src/Old.php', lines: [] },
    { path: 'src/B.php', lines: [] },
    { path: 'src/C.png', lines: [] },
    { path: 'src/D.php', lines: ['gone'] },
  ]);
});

test('trimDiff keeps every anchor hit and selects the same references', () => {
  const filler = Array.from({ length: 30 }, (_, i) => `+    $x${i} = ${i};`);
  const diff = [
    'diff --git a/src/Core/Foo.php b/src/Core/Foo.php',
    '--- a/src/Core/Foo.php',
    '+++ b/src/Core/Foo.php',
    '@@ -1,3 +1,40 @@',
    ' context',
    ...filler,
    '+        $criteria = new Criteria();',
    '+        // Filtering on `available` instead would drop products.',
    '',
  ].join('\n');
  const trimmed = trimDiff(diff, [/new Criteria\(/u, /instead would/u], 5);
  assert.equal(parseDiff(trimmed)[0]?.lines.length, 7);
  assert.deepEqual([...selectedKeys(root, trimmed)], [...selectedKeys(root, diff)]);
  assert.ok(selectedKeys(root, diff).has('sw-review-learnings/references/code-comments.md'));
});

const at = (path: string): string => `diff --git a/${path} b/${path}\n--- a/${path}\n+++ b/${path}\n`;

test('touchesTests sees PHP and admin test files', () => {
  assert.ok(touchesTests(at('tests/unit/Core/FooTest.php')));
  assert.ok(touchesTests(at('src/Administration/foo/index.spec.js')));
  assert.ok(!touchesTests(at('src/Core/Foo.php')));
});
