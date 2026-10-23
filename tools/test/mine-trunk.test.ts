// Drift mining (plan WP8, WP12). The GitHub API is stubbed with responses
// recorded for 2026-10-13..2026-10-19, trimmed to the watched files and
// changed lines.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, test } from 'node:test';
import { type Catalog, loadCatalog } from '../src/catalog.ts';
import { allPages, type GitHubApi } from '../src/github.ts';
import { mapIndex } from '../src/map-signal.ts';
import { renderReport, stateFromReport } from '../src/mine-report.ts';
import {
  firstPass,
  type Mined,
  mineSource,
  parseStates,
  rangeCommits,
  windowAfter,
  windowCommits,
  windowOfDays,
} from '../src/mine-trunk.ts';
import { loadSources, type Source } from '../src/sources.ts';

const ROOT = resolve(import.meta.dirname, '../..');
const SOURCES = loadSources(ROOT);
const TRUNK: Source = SOURCES.find((s) => s.id === 'shopware') ?? SOURCES[0] ?? assert.fail('no shopware source');
const report = (mined: Mined[], catalog: Catalog = loadCatalog(ROOT)): string =>
  renderReport(mined, catalog, mapIndex(ROOT, catalog, SOURCES));
const FIXTURE = join(import.meta.dirname, 'fixtures/mining/shopware-2026-10-13..2026-10-19.json');
const HAND_MINED = ['f2bf3794', '75b0a495', '190d734b', '8dc74f24', '7ad011f1'];

function recorded(): GitHubApi {
  const body: unknown = JSON.parse(readFileSync(FIXTURE, 'utf8'));
  const responses = new Map(Object.entries(typeof body === 'object' && body !== null ? body : {}));
  return (path) => (responses.has(path) ? Promise.resolve(responses.get(path)) : Promise.reject(new Error(path)));
}

const shortShas = (section: string): string[] =>
  Array.from(section.matchAll(/^- \[([0-9a-f]{8})\]/gmu), (m) => m[1] ?? '');
const section = (text: string, title: string): string => text.split(`## ${title}\n`)[1]?.split('\n## ')[0] ?? '';
/** One `### ` group of a skill section. */
const group = (text: string, skill: string, title: string): string =>
  section(text, skill).split(`### ${title}`)[1]?.split('\n### ')[0] ?? '';

describe('the 2026-10-13..2026-10-19 window', () => {
  const mined = mineSource(recorded(), TRUNK, windowOfDays('2026-10-13', '2026-10-19'));
  const text = mined.then((m) => report([m]));

  test('reports the five commits found by hand', async () => {
    const commits = shortShas(section(await text, 'Commits'));
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
    assert.match(await text, /^Without a delta: \[d10e3c4f\].*\[53a6cceb\].*\[00689309\].*\[36e19f9d\]/mu);
    assert.match(await text, /^\| `shopware` \| 2026-10-13 \| 12 \| 8 \| \[21949101\]/mu);
  });
  test('rule classes land under the rule whose enforced_by cites them', async () => {
    const t = await text;
    assert.match(
      group(t, 'sw-testing', 'TEST-016'),
      /- Rule class `NoAssertionInEventHookRule` \(phpstan\) added \(\[f2bf3794\]/u,
    );
    assert.match(group(t, 'sw-testing', 'TEST-016'), /Matched by `enforced_by`, `trunk\.source`\./u);
    assert.match(group(t, 'sw-testing', 'TEST-011'), /- Rule class `SingleCoversClassInTests` \(danger\) modified/u);
    assert.match(section(t, 'Unmapped'), /- Rule class `DeprecatedEntityConstructionRule` \(phpstan\) added/u);
    assert.doesNotMatch(t, /StoreApiRouteExtensionRule/u, 'a modified class nobody cites is noise');
  });
  test('guideline headings map through trunk.source anchors', async () => {
    const t = await text;
    assert.match(group(t, 'sw-testing', 'TEST-016'), /- Added guideline heading in .*`## Observing events in tests`/u);
    for (const id of ['CORE-069', 'CORE-070', 'CORE-071']) {
      assert.match(group(t, 'sw-core-development', id), /`### Configuration and operations`/u, id);
    }
    assert.match(section(t, 'Unmapped'), /`## What counts as a break`/u, 'a heading no rule cites');
  });
  test('skill bullets map through routes or the source skill list; template lines through PRD-001', async () => {
    const t = await text;
    assert.match(
      group(t, 'sw-testing', '`references/test-shape-and-flags.md`'),
      /Matched by its route\. Rules there: TEST-016.*\n\n- Removed agent skill bullet .*#\[CoversClass\]/su,
    );
    assert.match(
      group(t, 'sw-testing', 'No rule yet'),
      /- Added agent skill bullet .*Never add listeners to the shared `event_dispatcher`/u,
    );
    const template = group(t, 'sw-pr-description', 'PRD-001');
    assert.match(template, /Matched by `trunk\.source`\./u);
    assert.match(template, /- Removed PR template line: .*RELEASE_INFO-6\.<major>\.md/u);
  });
  test('the report records trunk head as the next state', async () => {
    assert.deepEqual(stateFromReport(await text), {
      shopware: { last_sha: '219491014944c6b6463cf6426c7001adea8dae0d', last_date: '2026-10-19T19:45:03Z' },
    });
  });
  test('the committed state is mined up to this window or later, for every source', async () => {
    // `/mined` moves docs/.mining-state.json on, so it only ever passes the
    // recorded window; it never equals it for long.
    const states = parseStates(JSON.parse(readFileSync(join(ROOT, 'docs/.mining-state.json'), 'utf8')));
    const trunk = states.shopware ?? assert.fail('no shopware state');
    assert.match(trunk.last_sha, /^[0-9a-f]{40}$/u);
    assert.ok(trunk.last_date >= (stateFromReport(await text).shopware?.last_date ?? ''), trunk.last_date);
    assert.deepEqual(Object.keys(states).toSorted(), SOURCES.map((s) => s.id).toSorted());
  });
});

describe('more than one source', () => {
  const upstream: Source = {
    id: 'up',
    repo: 'acme/skills',
    branch: 'main',
    extractor: 'markdown',
    paths: ['skills'],
    skills: [{ path: 'skills/phpunit', skills: ['sw-testing'] }],
  };
  const commit = {
    sha: 'c'.repeat(40),
    title: 'docs: phpunit',
    date: '2026-10-22T08:00:00Z',
    files: [
      {
        filename: 'skills/phpunit/SKILL.md',
        status: 'modified',
        additions: 2,
        deletions: 0,
        patch: '@@ -1,1 +1,3 @@\n # PHPUnit\n+## Data providers\n+- Name every data set.',
      },
    ],
  };
  const api: GitHubApi = (path) => {
    if (path.startsWith('repos/acme/skills/commits?sha=main&until='))
      return Promise.resolve([{ sha: commit.sha, commit: { committer: { date: commit.date } } }]);
    if (path.startsWith('repos/acme/skills/commits?sha=main&path=skills'))
      return Promise.resolve([{ sha: commit.sha, commit: { committer: { date: commit.date } } }]);
    if (path === `repos/acme/skills/commits/${commit.sha}`)
      return Promise.resolve({
        sha: commit.sha,
        commit: { message: commit.title, committer: { date: commit.date } },
        files: commit.files,
      });
    return Promise.reject(new Error(path));
  };

  test('an upstream Markdown change maps to the source skill; a new source gets a first pass', async () => {
    const w = windowOfDays('2026-10-20', '2026-10-26');
    const sources = [...SOURCES, upstream];
    const catalog = loadCatalog(ROOT);
    const mined = [await mineSource(api, upstream, w), await firstPass(api, { ...upstream, id: 'new' }, w.to)];
    const t = renderReport(mined, catalog, mapIndex(ROOT, catalog, sources));
    const noRule = group(t, 'sw-testing', 'No rule yet');
    assert.match(
      noRule,
      /- Added line in `skills\/phpunit\/SKILL\.md`: `## Data providers` \(\[cccccccc\]\(.*\), up\)/u,
    );
    assert.match(noRule, /- Added line in `skills\/phpunit\/SKILL\.md`: `Name every data set\.`/u);
    assert.match(t, /^\| `new` \| \| first pass \| \| \[cccccccc\]/mu);
    assert.match(section(t, 'Commits'), /### new\n\nFirst pass: the next report starts after \[cccccccc\]/u);
    assert.deepEqual(Object.keys(stateFromReport(t)), ['up', 'new']);
  });
  test('a rule citing an upstream heading takes the change', () => {
    const base = loadCatalog(ROOT);
    const rule = base.rules.find((r) => r.id === 'TEST-014') ?? assert.fail('TEST-014');
    const cited = { ...rule, upstream: [{ source: 'up', path: 'skills/phpunit/SKILL.md#data-providers' }] };
    const catalog: Catalog = { ...base, rules: base.rules.map((r) => (r === rule ? cited : r)) };
    const mined: Mined = {
      source: upstream,
      window: windowOfDays('2026-10-20', '2026-10-26'),
      head: { sha: commit.sha, date: commit.date },
      commits: [
        {
          commit,
          deltas: {
            bullets: [],
            headings: [{ file: 'skills/phpunit/SKILL.md', change: '+', text: '## Data providers' }],
            guideIds: [],
            template: [],
            classes: [],
            truncated: [],
          },
        },
      ],
    };
    const t = renderReport([mined], catalog, mapIndex(ROOT, catalog, [...SOURCES, upstream]));
    assert.match(
      group(t, 'sw-testing', 'TEST-014'),
      /Matched by `upstream`\.\n\n- Added line in .*`## Data providers`/u,
    );
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
    source: TRUNK,
    window: windowOfDays('2026-10-20', '2026-10-26'),
    head: { sha: commit.sha, date: commit.date },
    commits: [{ commit, deltas }],
  };
}

describe('core guide IDs', () => {
  test('a guide ID no rule cites goes to the review skills; a removed ID still cited lands under its rule', () => {
    const catalog: Catalog = {
      prefixes: {},
      rules: [{ ...loadCatalog(ROOT).rules[0], id: 'CORE-900', core_guide_ids: ['BCPHP-001', 'BCPHP-002'] }].filter(
        (r): r is Catalog['rules'][number] => r.skill !== undefined,
      ),
    };
    const t = report([guideMined('')], catalog);
    const noRule = group(t, 'sw-extension-review', 'No rule yet');
    assert.match(noRule, /^- Added core guide ID BCPHP-011 in `\.agents\/skills\/sw-review\/guides\/bc-php\.md`/mu);
    assert.doesNotMatch(noRule, /BCPHP-00[12]/u);
    const skill = catalog.rules[0]?.skill ?? '';
    assert.match(group(t, skill, 'CORE-900'), /Matched by `core_guide_ids`\.\n\n- Added core guide ID BCPHP-001/u);
    assert.match(group(t, skill, 'CORE-900'), /- Removed core guide ID BCPHP-002/u);
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
    assert.throws(() => parseStates({ shopware: { last_sha: 1 } }), /needs last_sha and last_date/u);
    assert.throws(() => stateFromReport('no marker'), /no mine-trunk-state marker/u);
  });
  test('the single-source state and report marker from before WP12 read as shopware', () => {
    const old = { last_sha: 'x', last_date: '2026-10-19' };
    assert.deepEqual(parseStates(old), { shopware: old });
    assert.deepEqual(stateFromReport(`body\n<!-- mine-trunk-state: ${JSON.stringify(old)} -->\n`), { shopware: old });
  });
  test('commits come from every watched path once, oldest first, without the skipped one', async () => {
    const refs = await windowCommits(twoPaths, TRUNK, { from: '2026-10-20T00:00:00Z', to: 'T', skip: 'old' });
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

const ref = (n: number): unknown => ({
  sha: `c${n}`,
  commit: { committer: { date: '2026-10-20T00:00:00Z' } },
  parents: [{}],
});
const file = (filename: string): unknown => ({ filename, status: 'added', additions: 1, deletions: 0 });

describe('pagination', () => {
  test('the compare API is read page by page until total_commits', async () => {
    const asked: string[] = [];
    const api: GitHubApi = (path) => {
      asked.push(path);
      const page = Number(/page=(\d+)$/u.exec(path)?.[1]);
      const count = page === 3 ? 5 : 100;
      return Promise.resolve({
        total_commits: 205,
        commits: Array.from({ length: count }, (_, i) => ref((page - 1) * 100 + i)),
      });
    };
    const refs = await rangeCommits(api, TRUNK, 'a', 'b');
    assert.equal(refs.length, 205);
    assert.equal(asked.length, 3);
    assert.equal(asked[2], `repos/${TRUNK.repo}/compare/a...b?per_page=100&page=3`);
  });

  // A commit with more than 300 files lists the rest on further pages; a
  // rule class on page 2 is still a change.
  test('the files of a large commit are read past the first 300', async () => {
    const detail = `repos/${TRUNK.repo}/commits/big`;
    const api: GitHubApi = (path) => {
      if (path.endsWith('&per_page=1')) return Promise.resolve([ref(0)]);
      if (path.startsWith(`repos/${TRUNK.repo}/commits?`)) {
        return Promise.resolve(
          path.includes('path=src') ? [{ sha: 'big', commit: { committer: { date: '2026-10-14T00:00:00Z' } } }] : [],
        );
      }
      if (path === detail) {
        return Promise.resolve({
          sha: 'big',
          commit: { message: 'Big', committer: { date: '2026-10-14T00:00:00Z' } },
          files: Array.from({ length: 300 }, (_, i) => file(`src/Core/F${i}.php`)),
        });
      }
      if (path === `${detail}?page=2`) {
        return Promise.resolve({
          sha: 'big',
          commit: { message: 'Big', committer: { date: '2026-10-14T00:00:00Z' } },
          files: [file('src/Core/DevOps/StaticAnalyze/PHPStan/Rules/NoLateRule.php')],
        });
      }
      return Promise.reject(new Error(`unexpected ${path}`));
    };
    const mined = await mineSource(api, TRUNK, windowOfDays('2026-10-13', '2026-10-19'));
    const big = mined.commits[0] ?? assert.fail('the commit is not mined');
    assert.equal(big.commit.files.length, 301);
    assert.deepEqual(
      big.deltas.classes.map((c) => c.name),
      ['NoLateRule'],
    );
  });
});
