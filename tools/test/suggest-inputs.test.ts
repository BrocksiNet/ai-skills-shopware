// suggest-rules (plan WP12 step 4): the inputs (window, release assets,
// drift issue) and the retirement evidence. No model, no network.
import assert from 'node:assert/strict';
import { utimesSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, test } from 'node:test';
import { gzipSync } from 'node:zlib';
import type { Catalog } from '../src/catalog.ts';
import { driftSignals, monthsBetween, parseSince, syncRelease } from '../src/suggest-load.ts';
import { abCandidates, apiCandidates, enforcedCandidates, readApiIndex } from '../src/suggest-retire.ts';
import { abResult, rule, scratch } from './suggest-fixture.ts';

const tmp = scratch();

const asset = (name: string): object => ({
  name,
  browser_download_url: `https://dl/${name}`,
  updated_at: '2026-10-20T00:00:00Z',
});

const indexItem = (id: string, present: unknown[]): object => ({
  id: `php:${id}`,
  kind: 'class',
  present,
  history: {},
});

describe('inputs', () => {
  test('--since takes a date or days', () => {
    assert.equal(parseSince('30d', new Date('2026-10-23T12:00:00Z')), '2026-09-23');
    assert.equal(parseSince('2026-09-01', new Date()), '2026-09-01');
    assert.throws(() => parseSince('last week', new Date()), /--since/u);
    assert.deepEqual(monthsBetween('2026-09-15', '2026-11-02'), ['2026-09', '2026-10', '2026-11']);
  });
  test('downloads only the window and newer assets', async () => {
    const dir = join(tmp, 'cache');
    const fetched: string[] = [];
    const names = ['core-reviews-2026-08.jsonl', 'core-reviews-2026-10.jsonl', 'reviewers.json'];
    const options = {
      api: (): Promise<unknown> => Promise.resolve({ assets: names.map((a) => asset(a)) }),
      fetchText: (url: string): Promise<string> => {
        fetched.push(url);
        return Promise.resolve('');
      },
      repo: 'o/r',
      dir,
      months: ['2026-09', '2026-10'],
    };
    assert.deepEqual(await syncRelease(options), ['core-reviews-2026-10.jsonl', 'reviewers.json']);
    utimesSync(join(dir, 'reviewers.json'), new Date('2026-10-21'), new Date('2026-10-21'));
    utimesSync(join(dir, 'core-reviews-2026-10.jsonl'), new Date('2026-10-01'), new Date('2026-10-01'));
    assert.deepEqual(await syncRelease(options), ['core-reviews-2026-10.jsonl']);
    assert.equal(fetched.length, 3);
  });
  test('reads the changes of a drift issue with their groups, not its review section', () => {
    const body = [
      '# Drift up to 2026-10-19',
      '## sw-testing',
      '### TEST-014: Exception messages',
      '- Rule class `NoExpectExceptionMessageRule` (phpstan) modified ([1a2b3c4d](https://github.com/shopware/shopware/commit/1a2b), shopware)',
      '### `references/test-shape-and-flags.md`',
      '- Added agent skill bullet in `.agents/skills/x/SKILL.md`: `Use x` ([5e6f](https://github.com/shopware/shopware/commit/5e6f), shopware)',
      '## Unmapped',
      '- Added guideline heading in `coding-guidelines/core/a.md`: `## New` ([9a9a](https://github.com/shopware/shopware/commit/9a9a), shopware)',
      '## Review comments',
      '- not a change',
    ].join('\n');
    const s = driftSignals({ number: 7, url: 'https://github.com/o/r/issues/7', body }, 'o/r');
    assert.deepEqual(
      s.map((x) => [x.kind, x.url.slice(-4), x.map[0]?.rules[0] ?? x.map[0]?.reference ?? '-']),
      [
        ['rule-class', '1a2b', 'TEST-014'],
        ['skill-bullet', '5e6f', 'references/test-shape-and-flags.md'],
        ['guideline-heading', '9a9a', '-'],
      ],
    );
  });
});

describe('retirement evidence', () => {
  const check = { kind: 'phpstan' as const, catches: 'c', misses: 'm' };
  const catalog: Catalog = {
    prefixes: {},
    rules: [
      rule('TEST-901', { trunk: { enforced_by: [{ ...check, tool: 'A', trunk_only: false }] } }),
      rule('TEST-902', { trunk: { enforced_by: [{ ...check, tool: 'B', trunk_only: true }] } }),
      rule('TEST-903', { eval: 'task-a' }),
      rule('TEST-904', { eval: 'task-b' }),
      rule('TEST-905', { status: 'retired', trunk: { enforced_by: [{ ...check, tool: 'C', trunk_only: false }] } }),
    ],
  };
  test('a check that is not trunk-only', () => {
    assert.deepEqual(
      enforcedCandidates(catalog).map((c) => c.rule),
      ['TEST-901'],
    );
  });
  test('the skill-off arm passes every repeat in the latest result', () => {
    const results = [
      abResult('task-a', 1, '2026-09-01'),
      abResult('task-a', 3, '2026-10-01'),
      abResult('task-b', 2, '2026-10-01'),
    ];
    assert.deepEqual(
      abCandidates(catalog, results, 'b.jsonl').map((c) => c.rule),
      ['TEST-903'],
    );
  });
  test('every class the rule names is gone from the supported releases', () => {
    const path = join(tmp, 'index.json.gz');
    const releases = ['6.5.0.0', '6.6.0.0', 'trunk'].map((release) => ({ release }));
    const items = [
      indexItem('Shopware\\Old\\Gone', [['6.5.0.0', '6.5.0.0']]),
      indexItem('Shopware\\New\\Kept', [['6.5.0.0', null]]),
    ];
    writeFileSync(path, gzipSync(JSON.stringify({ schema: 1, releases, items })));
    const text: Record<string, string> = {
      'TEST-901': 'Never use `Gone`.',
      'TEST-902': 'Use `Kept` instead of `Gone`.',
      'TEST-903': 'Use `Unknown`.',
    };
    const found = apiCandidates(catalog, readApiIndex(path), '6.6.0.0', (r) => text[r.id] ?? '');
    assert.deepEqual(
      found.map((c) => c.rule),
      ['TEST-901'],
    );
  });
});
