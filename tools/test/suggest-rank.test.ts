// The ranking of suggest-rules proposals: evidence once per PR, core-only
// rules halved, an overlap with a higher proposal of the same skill halved,
// failed and no-change proposals unranked.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type { Catalog } from '../src/catalog.ts';
import type { Signal } from '../src/signals.ts';
import type { Suggestion } from '../src/suggest-ask.ts';
import { evidenceScore, inRankOrder, type RankContext, rankSuggestions } from '../src/suggest-rank.ts';
import { proposal, rule, signal } from './suggest-fixture.ts';

const sig = (pr: number, fields: { state?: string; outdated?: boolean } = {}): Signal => signal({ pr, ...fields });

const suggestion = (id: string, fields: Partial<Suggestion>): Suggestion => ({
  ...proposal({}),
  id,
  cluster: 'c',
  checks: [],
  ok: true,
  private: false,
  ...fields,
});

const context = (signals: Signal[], catalog: Catalog): RankContext => ({
  catalog,
  signals: new Map(signals.map((s) => [s.url, s])),
  trustOf: () => 0.5,
  contexts: new Map([
    ['sw-core-development', ['core']],
    ['sw-review-learnings', ['core', 'plugin', 'app', 'project']],
  ]),
});

describe('rank', () => {
  const a1 = sig(1);
  const a2 = sig(1, { state: 'CHANGES_REQUESTED' });
  const b = sig(2, { outdated: true });
  const c = sig(3);
  const catalog: Catalog = {
    prefixes: {},
    rules: [rule('CORE-001', { skill: 'sw-core-development', audience: ['core'] })],
  };
  const x = context([a1, a2, b, c], catalog);

  test('evidence counts each PR once, at its heaviest signal', () => {
    const e = evidenceScore([a1.url, a2.url, b.url], x);
    assert.equal(e.prs, 2);
    assert.equal(e.changes_requested, 1);
    assert.equal(e.score, 0.75 + 0.75);
  });

  test('an overlap across skills counts too', () => {
    const list = [
      suggestion('e-01', { title: 'Admin routes declare an ACL privilege', evidence: [a2.url, b.url] }),
      suggestion('e-02', {
        skill: 'sw-core-development',
        title: 'Admin routes declare their ACL privilege',
        evidence: [a2.url],
      }),
    ];
    const by = new Map(rankSuggestions(list, x).map((s) => [s.id, s.rank]));
    assert.equal(by.get('e-02')?.overlaps, 'e-01');
  });

  test('core-only rules and overlaps are halved; failed and none are unranked', () => {
    const list = [
      suggestion('d-01', {
        title: 'Wrap admin patterns in a group',
        draft: 'Group the pattern.',
        evidence: [a2.url, b.url],
      }),
      suggestion('d-02', {
        title: 'Wrap admin patterns in a group before anchoring',
        draft: 'Group the pattern.',
        evidence: [a2.url, b.url, c.url],
      }),
      suggestion('d-03', {
        action: 'update',
        rule: 'CORE-001',
        skill: 'sw-core-development',
        title: 'Release notes',
        evidence: [a2.url, b.url, c.url],
      }),
      suggestion('d-04', { ok: false, evidence: [a1.url] }),
      suggestion('d-05', { action: 'none', rule: 'CORE-001', evidence: [a1.url] }),
    ];
    const ranked = rankSuggestions(list, x);
    const by = new Map(ranked.map((s) => [s.id, s.rank]));
    assert.equal(by.get('d-02')?.position, 1);
    assert.equal(by.get('d-01')?.overlaps, 'd-02');
    assert.equal(by.get('d-01')?.score, 0.75);
    assert.equal(by.get('d-03')?.extensions, false);
    assert.equal(by.get('d-03')?.score, 1);
    assert.equal(by.get('d-04')?.position, 0);
    assert.equal(by.get('d-05')?.unranked, 'proposes no change');
    assert.deepEqual(
      inRankOrder(ranked).map((s) => s.id),
      ['d-02', 'd-03', 'd-01', 'd-04', 'd-05'],
    );
  });
});
