// Signal format and mapper (plan WP12 step 2).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, test } from 'node:test';
import { loadCatalog } from '../src/catalog.ts';
import { mapIndex, mapSignal, mapSignals, slug } from '../src/map-signal.ts';
import { commitSignals, parseSignals, type Signal, toJsonLines } from '../src/signals.ts';
import { loadSources } from '../src/sources.ts';
import { commitDeltas } from '../src/trunk-deltas.ts';

const ROOT = resolve(import.meta.dirname, '../..');
const SOURCES = loadSources(ROOT);
const INDEX = mapIndex(ROOT, loadCatalog(ROOT), SOURCES);
const REVIEWS = parseSignals(readFileSync(join(import.meta.dirname, 'fixtures/signals/pr-19917.jsonl'), 'utf8'));

const signal = (over: Partial<Signal>): Signal => ({
  id: 'x',
  source: 'shopware',
  kind: 'skill-bullet',
  repo: 'shopware/shopware',
  url: 'https://github.com/shopware/shopware/commit/x',
  date: '2026-10-20T00:00:00Z',
  path: '',
  text: '',
  map: [],
  ...over,
});

describe('slug', () => {
  test('matches the anchors the catalog cites', () => {
    assert.equal(slug('### Storefront (Twig, JS, SCSS)'), 'storefront-twig-js-scss');
    assert.equal(
      slug('## Cache keys contain every input, tags stay few'),
      'cache-keys-contain-every-input-tags-stay-few',
    );
    assert.equal(slug('## Observing events in tests'), 'observing-events-in-tests');
  });
});

describe('mapSignal', () => {
  test('a guide ID and a rule class map to the rules that cite them', () => {
    const cls = mapSignal(
      signal({
        kind: 'rule-class',
        path: 'src/Core/DevOps/StaticAnalyze/PHPStan/Rules/X.php',
        text: 'NoAssertionInEventHookRule',
      }),
      INDEX,
    );
    assert.deepEqual(cls, [{ skill: 'sw-testing', rules: ['TEST-016'], via: 'enforced_by' }]);
    assert.deepEqual(mapSignal(signal({ kind: 'guide-id', text: 'NOPE-001' }), INDEX), []);
  });
  test('a heading maps through a trunk.source anchor; another heading in the same file does not', () => {
    const path = 'coding-guidelines/core/unit-tests.md';
    const hit = mapSignal(signal({ kind: 'guideline-heading', path, text: '## Observing events in tests' }), INDEX);
    assert.deepEqual(hit, [{ skill: 'sw-testing', rules: ['TEST-016'], via: 'trunk.source' }]);
    assert.deepEqual(mapSignal(signal({ kind: 'guideline-heading', path, text: '## Something else' }), INDEX), []);
  });
  test('an upstream change falls back to the skills of its path', () => {
    const maps = mapSignal(
      signal({
        source: 'ai-coding-tools',
        kind: 'upstream-line',
        path: 'plugins/test-writing/AGENTS.md',
        text: 'Plain words',
      }),
      INDEX,
    );
    assert.deepEqual(maps, [{ skill: 'sw-testing', rules: [], via: 'source' }]);
  });
  test('a review comment routes by its path and diff lines', () => {
    const [dynamicAccess, history] = REVIEWS.map((s) => mapSignal(s, INDEX));
    const dal =
      (dynamicAccess ?? []).find((m) => m.reference === 'references/dal-and-performance.md') ??
      assert.fail('the Dynamic Access comment selects no DAL reference');
    assert.equal(dal.skill, 'sw-review-learnings');
    assert.equal(dal.via, 'routes');
    assert.ok(dal.rules.includes('REV-035'), 'the blocking Dynamic Access finding reaches REV-035');
    // The history-comment finding behind REV-034 matches no route trigger:
    // its hunk has no history words in comment lines. Recognising it as
    // covered is the suggest step's job (plan WP12 step 4).
    assert.ok(!(history ?? []).some((m) => m.rules.includes('REV-034')));
  });
  test('borrowed routes are left to their owner', () => {
    const maps = REVIEWS.flatMap((s) => mapSignal(s, INDEX));
    assert.ok(maps.every((m) => !(m.reference ?? '').startsWith('../')));
    assert.ok(!maps.some((m) => m.skill === 'sw-extension-review'));
  });
});

describe('signals', () => {
  test('a Markdown commit becomes upstream-line signals with stable IDs', () => {
    const source = SOURCES.find((s) => s.id === 'ai-coding-tools') ?? assert.fail('ai-coding-tools');
    const commit = {
      sha: 'd'.repeat(40),
      title: 'docs',
      date: '2026-10-22T00:00:00Z',
      files: [
        {
          filename: 'plugins/test-writing/README.md',
          status: 'modified',
          additions: 2,
          deletions: 1,
          patch: '@@\n-- old\n+- new\n+## Head',
        },
        {
          filename: 'plugins/test-writing/run.sh',
          status: 'modified',
          additions: 1,
          deletions: 0,
          patch: '@@\n+- not markdown',
        },
      ],
    };
    const signals = commitSignals(source, { commit, deltas: commitDeltas(commit, source.extractor) });
    assert.deepEqual(
      signals.map((s) => `${s.kind} ${s.change ?? ''}${s.text}`),
      ['upstream-line -old', 'upstream-line +new', 'upstream-line +## Head'],
    );
    assert.equal(signals[1]?.id, 'shopwareLabs/ai-coding-tools@dddddddddddd:plugins/test-writing/README.md:+new');
    const mapped = mapSignals(signals, INDEX);
    assert.deepEqual(parseSignals(toJsonLines(mapped)), mapped, 'JSON Lines round trip');
  });
  test('parseSignals names the first bad line', () => {
    assert.throws(() => parseSignals(`${toJsonLines(REVIEWS)}{"id":1}\n`), /line 3 is not a signal/u);
  });
});
