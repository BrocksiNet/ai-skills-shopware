// Trunk mining (plan WP8). The GitHub API is stubbed with responses recorded
// for 2026-10-13..2026-10-19, trimmed to the watched files and changed lines.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, test } from 'node:test';
import { type Catalog, loadCatalog } from '../src/catalog.ts';
import { allPages, type GitHubApi } from '../src/github.ts';
import { renderReport, stateFromReport } from '../src/mine-report.ts';
import { type Mined, mineTrunk, parseState, windowAfter, windowCommits, windowOfDays } from '../src/mine-trunk.ts';

const ROOT = resolve(import.meta.dirname, '../..');
const FIXTURE = join(import.meta.dirname, 'fixtures/mine-trunk/2026-10-13..2026-10-19.json');
const HAND_MINED = ['f2bf3794', '75b0a495', '190d734b', '8dc74f24', '7ad011f1'];

function recorded(): GitHubApi {
  const body: unknown = JSON.parse(readFileSync(FIXTURE, 'utf8'));
  const responses = new Map(Object.entries(typeof body === 'object' && body !== null ? body : {}));
  return (path) => (responses.has(path) ? Promise.resolve(responses.get(path)) : Promise.reject(new Error(path)));
}

const shortShas = (section: string): string[] =>
  Array.from(section.matchAll(/^- \[([0-9a-f]{8})\]/gmu), (m) => m[1] ?? '');
const section = (report: string, title: string): string => report.split(`## ${title}\n`)[1]?.split('\n## ')[0] ?? '';

describe('the 2026-10-13..2026-10-19 window', () => {
  const mined = mineTrunk(recorded(), windowOfDays('2026-10-13', '2026-10-19'));
  const report = mined.then((m) => renderReport(m, loadCatalog(ROOT)));

  test('reports the five commits found by hand', async () => {
    const commits = shortShas(section(await report, 'Commits'));
    for (const sha of HAND_MINED) assert.ok(commits.includes(sha), sha);
    assert.deepEqual(commits, [
      '7ad011f1',
      'f0e46ffa',
      '190d734b',
      '8dc74f24',
      '75b0a495',
      'f2bf3794',
      '0e782aa7',
      '0fa3e10a',
    ]);
    assert.match(await report, /^Without a delta: \[d10e3c4f\].*\[53a6cceb\].*\[00689309\].*\[36e19f9d\]/mu);
  });
  test('rule classes against enforced_by', async () => {
    const enforcement = section(await report, 'New enforcement');
    assert.match(
      enforcement,
      /\| `DeprecatedEntityConstructionRule` \| phpstan \| added \| .* \| \*\*unmapped\*\* \|/u,
    );
    assert.match(enforcement, /\| `NoAssertionInEventHookRule` \| phpstan \| added \| .* \| TEST-016 \|/u);
    assert.match(enforcement, /\| `SingleCoversClassInTests` \| danger \| modified \| .* \| TEST-011 \|/u);
    assert.doesNotMatch(enforcement, /StoreApiRouteExtensionRule/u, 'a modified class nobody cites is noise');
  });
  test('headings, skill bullets and the PR template', async () => {
    const text = await report;
    assert.match(
      section(text, 'Changed guideline headings'),
      /- Added: `## Observing events in tests` \(\[f2bf3794\]/u,
    );
    const bullets = section(text, 'Agent skill bullets');
    assert.match(bullets, /`\.agents\/skills\/shopware-phpunit-tests\/SKILL\.md`/u);
    assert.match(bullets, /- Added: `` Never add listeners to the shared `event_dispatcher`/u);
    assert.match(section(text, 'PR template'), /- Removed: .*RELEASE_INFO-6\.<major>\.md/u);
    assert.equal(section(text, 'Unmapped core guide IDs').trim(), 'None.');
  });
  test('the report records trunk head as the next state', async () => {
    assert.deepEqual(stateFromReport(await report), {
      last_sha: '219491014944c6b6463cf6426c7001adea8dae0d',
      last_date: '2026-10-19T19:45:03Z',
    });
  });
  test('the committed state is mined up to this window or later', async () => {
    // `/mined` moves docs/.mining-state.json on, so it only ever passes the
    // recorded window; it never equals it for long.
    const state = parseState(JSON.parse(readFileSync(join(ROOT, 'docs/.mining-state.json'), 'utf8')));
    assert.match(state.last_sha, /^[0-9a-f]{40}$/u);
    assert.ok(state.last_date >= stateFromReport(await report).last_date, state.last_date);
  });
});

const item = (sha: string, date: string): unknown => ({ sha, commit: { committer: { date } } });

/** `b` on two watched paths, `old` (the skipped one) and `a` on one each. */
const twoPaths: GitHubApi = (path) =>
  Promise.resolve(
    path.includes('path=.agents')
      ? [item('b', '2026-10-21T00:00:00Z'), item('old', '2026-10-20T00:00:00Z')]
      : path.includes('path=coding-guidelines')
        ? [item('b', '2026-10-21T00:00:00Z'), item('a', '2026-10-20T12:00:00Z')]
        : [],
  );

/** A one-commit mining result with a review guide patch. */
function guideMined(patch: string): Mined {
  const commit = {
    sha: 'a'.repeat(40),
    title: 'feat: guides',
    date: '2026-10-25T10:00:00Z',
    files: [
      { filename: '.agents/skills/sw-review/guides/bc-php.md', status: 'modified', additions: 2, deletions: 1, patch },
    ],
  };
  const deltas = {
    bullets: [],
    headings: [],
    template: [],
    classes: [],
    truncated: [],
    guideIds: [
      { file: commit.files[0]?.filename ?? '', change: '+' as const, text: 'BCPHP-011' },
      { file: commit.files[0]?.filename ?? '', change: '+' as const, text: 'BCPHP-001' },
      { file: commit.files[0]?.filename ?? '', change: '-' as const, text: 'BCPHP-002' },
    ],
  };
  return {
    window: windowOfDays('2026-10-20', '2026-10-26'),
    head: { sha: commit.sha, date: commit.date },
    commits: [{ commit, deltas }],
  };
}

describe('core guide IDs', () => {
  test('unmapped when no rule cites them; a retired ID still cited is named', () => {
    const catalog: Catalog = {
      prefixes: {},
      rules: [{ ...loadCatalog(ROOT).rules[0], id: 'CORE-900', core_guide_ids: ['BCPHP-001', 'BCPHP-002'] }].filter(
        (r): r is Catalog['rules'][number] => r.skill !== undefined,
      ),
    };
    const ids = section(renderReport(guideMined(''), catalog), 'Unmapped core guide IDs');
    assert.match(ids, /^- BCPHP-011 in `\.agents\/skills\/sw-review\/guides\/bc-php\.md`/mu);
    assert.doesNotMatch(ids, /^- BCPHP-001/mu);
    assert.match(ids, /Retired, still cited by CORE-900: BCPHP-002/u);
  });
});

describe('windows and state', () => {
  test('a date-only state starts the next day; a timestamp skips its commit', () => {
    assert.deepEqual(windowAfter({ last_sha: 'x', last_date: '2026-10-19' }, 'T'), {
      from: '2026-10-20T00:00:00Z',
      to: 'T',
    });
    assert.deepEqual(windowAfter({ last_sha: 'x', last_date: '2026-10-19T19:45:03Z' }, 'T'), {
      from: '2026-10-19T19:45:03Z',
      to: 'T',
      skip: 'x',
    });
    assert.throws(() => windowOfDays('2026-10-13', 'now'), /YYYY-MM-DD/u);
    assert.throws(() => parseState({ last_sha: 1 }), /needs last_sha and last_date/u);
    assert.throws(() => stateFromReport('no marker'), /no mine-trunk-state marker/u);
  });
  test('commits come from every watched path once, oldest first, without the skipped one', async () => {
    const refs = await windowCommits(twoPaths, { from: '2026-10-20T00:00:00Z', to: 'T', skip: 'old' });
    assert.deepEqual(
      refs.map((r) => r.sha),
      ['a', 'b'],
    );
  });
  test('lists are read page by page', async () => {
    const asked: string[] = [];
    const api: GitHubApi = (path) => {
      asked.push(path);
      return Promise.resolve(Array.from({ length: path.endsWith('page=1') ? 100 : 3 }, (_, i) => i));
    };
    assert.equal((await allPages(api, 'repos/x/commits?sha=trunk')).length, 103);
    assert.deepEqual(asked, [
      'repos/x/commits?sha=trunk&per_page=100&page=1',
      'repos/x/commits?sha=trunk&per_page=100&page=2',
    ]);
  });
});
