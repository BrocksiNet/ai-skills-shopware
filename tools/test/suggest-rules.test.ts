// suggest-rules (plan WP12 step 4) end to end with the fake agent
// (FAKE_AGENT_MODE=suggest) answering through evals/runner/fake-agent.sh:
// the evidence check, the cap, schema failures and a retirement candidate.
// No model, no network.
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, test } from 'node:test';
import { asker } from '../src/agent-ask.ts';
import { renderSuggestions } from '../src/suggest-render.ts';
import { suggest, type SuggestOptions } from '../src/suggest-run.ts';
import { abResult, FAKE, ROOT, scratch, signal } from './suggest-fixture.ts';

const tmp = scratch();

/** The options without --skill, so the area clusters are asked. */
const unmapped = (o: SuggestOptions): SuggestOptions => {
  const { skill: _, ...rest } = o;
  return rest;
};

describe('suggest with the fake agent', () => {
  const file = join(tmp, 'signals.jsonl');
  const signals = [
    signal({ pr: 11, path: 'src/Core/Fake/A.php' }),
    signal({ pr: 12, path: 'src/Core/Fake/B.php' }),
    signal({ pr: 13, path: 'src/Storefront/Fake/C.php' }),
    signal({ pr: 14, path: 'src/Storefront/Fake/D.php' }),
    signal({ pr: 15, path: 'src/Elasticsearch/Fake/E.php' }),
    signal({ pr: 16, path: 'src/Elasticsearch/Fake/F.php' }),
  ];
  writeFileSync(file, signals.map((s) => `${JSON.stringify(s)}\n`).join(''));
  let calls = 0;
  const options = (mode: string, maxClusters = 20): SuggestOptions => {
    const ask = asker(ROOT, FAKE, { ...process.env, FAKE_AGENT_MODE: 'suggest', FAKE_SUGGEST: mode }, () => {});
    return {
      root: ROOT,
      now: new Date('2026-10-23T12:00:00Z'),
      since: '2026-09-01',
      until: '2026-10-23',
      sources: [],
      signalsFile: file,
      offline: true,
      repo: 'o/r',
      ask: (prompt) => {
        calls += 1;
        return ask(prompt);
      },
      agent: 'fake',
      model: 'none',
      maxClusters,
      maxSignals: 25,
      supportedFrom: '6.6.0.0',
      skill: 'sw-none',
      log: () => {},
    };
  };

  test('a new rule citing a URL that is not in the input fails the evidence check', async () => {
    const r = await suggest(unmapped(options('foreign-url')));
    const s = r.suggestions[0] ?? assert.fail('no suggestion');
    assert.equal(s.ok, false);
    assert.match(s.checks.find((c) => !c.ok)?.detail ?? '', /discussion_r999999/u);
  });
  test('a new rule citing only input URLs from two PRs passes', async () => {
    const r = await suggest(unmapped(options('new')));
    const area = r.suggestions.filter((s) => s.cluster.startsWith('area:'));
    assert.ok(area.length > 0);
    assert.ok(area.every((s) => s.ok));
    assert.match(renderSuggestions(r), /\| 2026-10-23-0[0-9] \| new \|/u);
  });
  test('the cap limits agent calls and lists the rest', async () => {
    calls = 0;
    const r = await suggest(unmapped(options('none', 2)));
    assert.equal(calls, 2);
    assert.equal(r.counts.asked, 2);
    assert.equal(r.counts.over_cap, r.counts.clusters + r.retirements.length - 2);
    assert.ok(r.counts.over_cap > 0);
  });
  test('schema failures and agent errors are reported, not proposed', async () => {
    const r = await suggest(unmapped(options('bad-schema', 3)));
    assert.equal(r.counts.proposals, 0);
    assert.ok(r.errors.some((e) => e.includes('action must be one of')));
    const broken = await suggest(unmapped(options('nope', 1)));
    assert.equal(broken.counts.agent_errors, 1);
  });
  test('a retirement candidate is explained through the same checks', async () => {
    const baseline = join(tmp, 'baseline.jsonl');
    writeFileSync(baseline, `${JSON.stringify(abResult('unit-test-exception-object', 3, '2026-10-01'))}\n`);
    const r = await suggest({ ...options('retire'), skill: 'sw-testing', baseline });
    const s = r.suggestions.find((x) => x.cluster === 'retire:ab:TEST-001') ?? assert.fail('no TEST-001');
    assert.equal(s.action, 'retire');
    assert.equal(s.ok, true);
  });
  test('no rule is a retirement candidate for a check plugins may not run', async () => {
    const r = await suggest({ ...options('retire'), skill: 'sw-testing' });
    assert.equal(
      r.retirements.find((c) => c.kind === 'enforced'),
      undefined,
    );
  });
  test('passing proposals are ranked, from 1 on', async () => {
    const r = await suggest(unmapped(options('new')));
    const ranked = r.suggestions.flatMap((s) => (s.rank === undefined || s.rank.position === 0 ? [] : [s.rank]));
    assert.ok(ranked.length > 0);
    assert.deepEqual(
      ranked.map((k) => k.position).toSorted((a, b) => a - b),
      ranked.map((_, i) => i + 1),
    );
    assert.ok(ranked.every((k) => k.prs === 2));
    assert.match(renderSuggestions(r), /\| Rank \| Score \|/u);
  });
  test('a second pass asks only the clusters the first did not, and keeps both', async () => {
    const first = await suggest(unmapped(options('new', 1)));
    calls = 0;
    const second = await suggest({ ...unmapped(options('new', 20)), previous: first });
    assert.equal(calls, first.counts.over_cap);
    assert.equal(second.counts.over_cap, 0);
    assert.equal(second.counts.asked, first.counts.asked + first.counts.over_cap);
    const ids = second.suggestions.map((s) => s.id);
    assert.equal(new Set(ids).size, ids.length);
    assert.deepEqual(
      ids.slice(0, first.suggestions.length),
      first.suggestions.map((s) => s.id),
    );
  });
});
