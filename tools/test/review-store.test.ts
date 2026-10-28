// The review-signals store, reviewer trust and the drift issue section (plan
// WP12 step 3). Fixture: review-fixture.ts.
import assert from 'node:assert/strict';
import { readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, test } from 'node:test';
import { renderReviewSection, reviewWeek, storedReviewWeek } from '../src/review-report.ts';
import { cursor, expire, mergeStore, monthFile, readStore, reviewers, trust } from '../src/review-store.ts';
import { INDEX, of, SIGNALS, tmp } from './review-fixture.ts';

describe('the store', () => {
  test('files by source and month of merge, replaces by ID, and keeps the cursor', () => {
    const dir = tmp();
    const first = SIGNALS.slice(0, 3);
    assert.equal(mergeStore(dir, first).added, 3);
    assert.equal(mergeStore(dir, SIGNALS).added, SIGNALS.length - 3);
    assert.deepEqual(readdirSync(dir), ['core-reviews-2026-10.jsonl']);
    assert.equal(monthFile(of(19917, 'The comment describes')), 'core-reviews-2026-10.jsonl');
    assert.equal(readStore(dir).length, SIGNALS.length);
    assert.equal(cursor(readStore(dir), 'core-reviews'), of(19917, 'The comment describes').pr?.merged_at);
    assert.equal(cursor(readStore(dir), 'commercial-reviews'), undefined);
  });
  test('expire deletes months older than the window', () => {
    const dir = tmp();
    for (const m of ['2025-10', '2025-11', '2026-10']) writeFileSync(join(dir, `core-reviews-${m}.jsonl`), '');
    assert.deepEqual(expire(dir, '2026-10-23T00:00:00Z', 12), ['core-reviews-2025-10.jsonl']);
    assert.deepEqual(readdirSync(dir).toSorted(), ['core-reviews-2025-11.jsonl', 'core-reviews-2026-10.jsonl']);
  });
});

describe('trust', () => {
  test('starts from membership and moves with the share of outdated threads', () => {
    assert.equal(trust({ associations: ['MEMBER'], comments: 0, outdated: 0 }), 0.5);
    assert.equal(trust({ associations: ['CONTRIBUTOR'], comments: 0, outdated: 0 }), 0.25);
    assert.equal(trust({ associations: ['CONTRIBUTOR'], comments: 20, outdated: 18 }), 0.79);
    assert.equal(trust({ associations: ['MEMBER'], comments: 20, outdated: 2 }), 0.17);
  });
  test('reviewers counts comments, reviews and PRs per login', () => {
    const list = reviewers(SIGNALS);
    const dg = list.find((r) => r.login === 'dgrothaus-sw') ?? assert.fail('dgrothaus-sw');
    assert.equal(dg.prs, 2);
    assert.deepEqual(dg.associations, ['MEMBER']);
    assert.ok(dg.comments > 0 && dg.outdated <= dg.comments);
    assert.equal(dg.trust, trust(dg));
  });
});

describe('the drift issue section', () => {
  test('counts the week per skill and reference, with PR links', () => {
    const lines = renderReviewSection(reviewWeek(SIGNALS, '2026-10-21'));
    const text = lines.join('\n');
    assert.equal(lines[0], '## Review comments');
    assert.match(
      text,
      /\| `sw-review-learnings` \| `references\/dal-and-performance\.md` \| [0-9]+ \| [0-9]+ \| .*#19917/u,
    );
    assert.match(text, /\| Unmapped \|/u);
  });
  test('leaves private sources out of the public issue', () => {
    const dir = tmp();
    const secret = SIGNALS.map((s) => ({ ...s, id: `${s.id}-c`, source: 'commercial-reviews' }));
    mergeStore(dir, [...SIGNALS, ...secret]);
    const week = storedReviewWeek(dir, INDEX, '2026-10-21', ['commercial-reviews']);
    assert.equal(week.signals.length, reviewWeek(SIGNALS, '2026-10-21').signals.length);
    assert.ok(week.signals.length > 0 && week.signals.every((s) => s.source === 'core-reviews'));
    assert.equal(week.from, '2026-10-15T00:00:00Z');
  });
  test('is left out when the week has no review', () => {
    assert.deepEqual(renderReviewSection(reviewWeek(SIGNALS, '2026-12-31')), []);
  });
});
