// Review collector (plan WP12 step 3): parsing, paging and the run. Fixture
// and stubs: review-fixture.ts.
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { describe, test } from 'node:test';
import { collect } from '../src/collect-run.ts';
import type { GitHubGraphql } from '../src/github.ts';
import { cursor, mergeStore } from '../src/review-store.ts';
import { cleanText, collectReviews, hunkLines, MIN_TEXT, prSignals, weeks } from '../src/reviews.ts';
import { checkReviewSources, loadReviewSources } from '../src/sources.ts';
import { CORE, of, page, recordedNodes, ROOT, SIGNALS, tmp } from './review-fixture.ts';

const tooMany: GitHubGraphql = () => Promise.resolve(page([], null, 1001));
const recorded: GitHubGraphql = () => Promise.resolve(page(recordedNodes()));

describe('prSignals on #19917 and #20855', () => {
  test('keeps the comments behind REV-034 and REV-035', () => {
    const dynamicAccess = of(19917, '=== src/Storefront/Framework/SystemCheck/ProductListingReadinessCheck.php:141');
    assert.match(dynamicAccess.text, /Dynamic Access/u);
    assert.equal(dynamicAccess.thread?.outdated, false, 'the REV-035 finding never went outdated');
    assert.equal(dynamicAccess.review?.state, 'CHANGES_REQUESTED');
    assert.ok(
      dynamicAccess.map.some((m) => m.skill === 'sw-review-learnings' && m.rules.includes('REV-035')),
      'mapped to the reference that holds REV-035',
    );
    of(19917, 'The comment describes earlier revisions of this PR');
    of(20855, 'The class docblock tells the #18906 story');
  });
  test('drops bots, the PR author and short comments', () => {
    assert.ok(SIGNALS.length > 0);
    for (const s of SIGNALS) {
      assert.ok(!(s.author?.login ?? '').includes('codex'), s.id);
      assert.notEqual(s.author?.login, 'BrocksiNet', s.id);
      assert.ok(s.text.length >= MIN_TEXT, s.id);
    }
  });
  test('IDs are stable and say what they are', () => {
    const ids = SIGNALS.map((s) => s.id);
    assert.equal(new Set(ids).size, ids.length);
    assert.ok(ids.every((id) => /^shopware\/shopware#(19917|20855)\/(review-comment|review)\/[0-9]+$/u.test(id)));
    const again = recordedNodes().flatMap((n) => prSignals(CORE, n));
    assert.deepEqual(
      again.map((s) => s.id),
      ids,
    );
  });
});

describe('text and hunks', () => {
  test('cleanText drops suggestion blocks and HTML comments', () => {
    assert.equal(cleanText('nit\n```suggestion\n$a = 1;\n```\n<!-- bot -->'), 'nit');
  });
  test('hunkLines keeps added and removed lines without the prefix', () => {
    assert.deepEqual(hunkLines('@@ -1,2 +1,2 @@\n context\n-old\n+new'), ['old', 'new']);
    assert.equal(hunkLines(`@@\n${'+x\n'.repeat(50)}`).length, 30);
  });
});

describe('collectReviews', () => {
  test('a backfill searches week by week', () => {
    const w = weeks('2026-09-01T00:00:00Z', '2026-10-20T23:59:59Z');
    assert.equal(w.length, 8);
    assert.equal(w[0]?.from, '2026-09-01T00:00:00Z');
    assert.equal(w.at(-1)?.to, '2026-10-20T23:59:59Z');
  });
  test('follows pages and counts a PR on a week boundary once', async () => {
    const [a, b] = recordedNodes();
    const asked: (string | null)[] = [];
    const gql: GitHubGraphql = (_query, vars) => {
      asked.push(vars.after ?? null);
      return Promise.resolve(vars.after === null ? page([a], 'next') : page([b, a]));
    };
    const got = await collectReviews(gql, CORE, { from: '2026-10-13T00:00:00Z', to: '2026-10-20T23:59:59Z' });
    assert.equal(got.queries, 4, 'two weeks, two pages each');
    assert.deepEqual(asked, [null, 'next', null, 'next']);
    assert.equal(got.prs, 2);
    assert.equal(got.signals.length, SIGNALS.length);
  });
  test('refuses a search past the 1000-result cap', async () => {
    await assert.rejects(
      collectReviews(tooMany, CORE, { from: '2026-10-01T00:00:00Z', to: '2026-10-02T00:00:00Z' }),
      /more than 1000 PRs/u,
    );
  });
});

describe('collect', () => {
  const base = { root: ROOT, gql: recorded, now: '2026-10-23T06:00:00Z' };

  test('CI refuses a private source; --public leaves it out', async () => {
    await assert.rejects(collect({ ...base, dir: tmp(), ci: true }), /private review sources stay off CI/u);
    const dir = tmp();
    const r = await collect({ ...base, dir, ci: true, publicOnly: true, since: '2026-10-13', until: '2026-10-20' });
    assert.deepEqual(
      r.runs.map((s) => s.source),
      ['core-reviews'],
    );
    assert.equal(r.runs[0]?.added, SIGNALS.length);
    assert.deepEqual(readdirSync(dir).toSorted(), ['core-reviews-2026-10.jsonl', 'reviewers.json']);
  });
  test('without --since, a run starts at the cursor', async () => {
    const dir = tmp();
    mergeStore(dir, SIGNALS);
    const r = await collect({ ...base, dir, sources: ['core-reviews'] });
    assert.equal(r.runs[0]?.from, cursor(SIGNALS, 'core-reviews'));
    assert.equal(r.runs[0]?.added, 0, 'a re-read adds nothing');
  });
  test('an unknown source is an error', async () => {
    await assert.rejects(collect({ ...base, dir: tmp(), sources: ['nope'] }), /unknown review source nope/u);
  });
});

describe('review sources', () => {
  test('need a boolean private and an ID no drift source has', () => {
    const { errors } = checkReviewSources(
      {
        reviews: [
          { id: 'shopware', repo: 'a/b', base: 'trunk', private: false },
          { id: 'x', repo: 'a/b', base: 'trunk', private: 'no' },
        ],
      },
      ['shopware'],
    );
    assert.deepEqual(errors, ['shopware: duplicate source id', 'x: private must be true or false']);
  });
  test('SwagCommercial is private', () => {
    const commercial = loadReviewSources(ROOT).find((s) => s.repo === 'shopware/SwagCommercial');
    assert.equal(commercial?.private, true);
  });
});
