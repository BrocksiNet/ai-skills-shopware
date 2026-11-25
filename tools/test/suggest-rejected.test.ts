// Rejected proposals (rules/rejected.json): the file check, the prompt block
// and the check that fails a proposal repeating a dropped one.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { loadCatalog } from '../src/catalog.ts';
import { askContext, checkAnswer } from '../src/suggest-ask.ts';
import { buildPrompt } from '../src/suggest-prompt.ts';
import { relatedRules } from '../src/suggest-related.ts';
import {
  checkRejected,
  droppedIndex,
  loadRejected,
  type Rejected,
  rejectedErrors,
  repeatsRejected,
} from '../src/suggest-rejected.ts';
import { proposal, ROOT, signal } from './suggest-fixture.ts';

const sync: Rejected = {
  proposal: '2026-11-23-06',
  date: '2026-11-24',
  action: 'new',
  rule: 'TEST-038',
  skill: 'sw-testing',
  title: 'Test cross-write DAL behavior via Sync API, not sequential single writes',
  text: 'Test a validator that merges several writes through one sync request.',
  reason: 'No measured effect.',
  pr: 'https://github.com/BrocksiNet/ai-skills-shopware/pull/203',
};
const adr: Rejected = {
  date: '2026-11-24',
  action: 'update',
  rule: 'CORE-052',
  skill: 'sw-core-development',
  title: 'Accepted ADRs are superseded by new ADRs, not modified in place',
  text: 'Write a new ADR instead of editing an accepted one.',
  reason: 'No measured effect.',
};

describe('rejected proposals', () => {
  test('the repo file is valid and names real skills', () => {
    assert.ok(loadRejected(ROOT).length > 0);
    const skills = loadCatalog(ROOT).rules.map((r) => r.skill);
    assert.deepEqual(rejectedErrors(ROOT, [...new Set(skills)]), []);
  });

  test('reports bad entries', () => {
    assert.match(checkRejected({}).errors.join(), /must be a list/u);
    const { rejected, errors } = checkRejected({
      rejected: [sync, { ...sync, action: 'retire', date: 'today', extra: 1, pr: 'http://x' }],
    });
    assert.equal(rejected.length, 1);
    const text = errors.join(' ');
    for (const e of [/action must be new or update/u, /date is not/u, /unknown field extra/u, /pr is not/u])
      assert.match(text, e);
  });

  test('fails a proposal that repeats a rejected one', () => {
    const again = proposal({
      skill: 'sw-testing',
      title: 'Cover cross-write DAL behavior with the Sync API instead of single writes',
      draft: 'Use one sync request with sequential operations.',
    });
    assert.equal(repeatsRejected(again, [sync, adr]), sync);
    const update = proposal({ action: 'update', rule: 'CORE-052', skill: 'sw-core-development', title: adr.title });
    assert.equal(repeatsRejected(update, [sync, adr]), adr);
  });

  test('lets other skills, rules, actions and topics through', () => {
    const again = proposal({ skill: 'sw-testing', title: sync.title });
    assert.equal(repeatsRejected({ ...again, skill: 'sw-core-development' }, [sync]), undefined);
    assert.equal(repeatsRejected({ ...again, action: 'none' }, [sync]), undefined);
    const other = {
      ...proposal({ action: 'update', rule: 'CORE-001', skill: 'sw-core-development' }),
      title: adr.title,
    };
    assert.equal(repeatsRejected(other, [adr]), undefined);
    // Shares "sync" and "writes" only: a different rule.
    const near = proposal({ skill: 'sw-testing', title: 'Sync writes need an idempotency key', draft: '' });
    assert.equal(repeatsRejected(near, [sync]), undefined);
  });

  test('the prompt lists dropped rules with their reason', () => {
    const catalog = loadCatalog(ROOT);
    const index = droppedIndex(catalog, [sync]);
    const s = signal({
      text: 'Please test this through the sync endpoint: sequential single writes miss the cross-write merge.',
    });
    const dropped = relatedRules(index, [s], [], 5);
    assert.equal(dropped[0]?.id, 'TEST-038');
    assert.ok(
      index.rules.some((r) => r.id !== 'TEST-038'),
      'retired catalog rules are in the index',
    );
    const prompt = buildPrompt({
      cluster: 'area:Core/Fake',
      criteria: '1. Delta',
      topics: new Map([['sw-testing', ['t']]]),
      rules: [],
      dropped,
      signals: [{ signal: s, trust: 0.5 }],
      maxProposals: 3,
    });
    assert.match(
      prompt,
      /Rules dropped before[^\n]*\n- TEST-038 \([^)]+\): [^\n]*Dropped 2026-11-24: No measured effect\. \(https:/u,
    );
  });

  test('suggest-rules fails the repeat with the reason and the PR', () => {
    const x = askContext(ROOT, loadCatalog(ROOT), { privateSources: new Set(), trustOf: () => 0.5, maxSignals: 5 });
    const s = signal({ text: 'Use the sync endpoint here.' });
    const c = { key: 'sw-testing', skill: 'sw-testing', rules: [], signals: [{ signal: s, weight: 1 }], score: 1 };
    const again = proposal({ skill: 'sw-testing', title: sync.title, evidence: [s.url] });
    const [suggestion] = checkAnswer(c, x, JSON.stringify([again])).suggestions;
    const check = suggestion?.checks.find((k) => k.name === 'not rejected before');
    assert.equal(suggestion?.ok, false);
    assert.match(
      check?.detail ?? '',
      /dropped 2026-11-24 in https:\/\/github\.com\/BrocksiNet\/ai-skills-shopware\/pull\/203: No measured effect/u,
    );
  });
});
