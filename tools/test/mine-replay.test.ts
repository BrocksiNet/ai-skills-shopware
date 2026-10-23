// Replays of past mining weeks (plan WP8, WP12 steps 1 and 2) against real
// GitHub API responses, recorded with fixtures/mining/record.ts and trimmed
// to what the miner reads. Every expectation below comes from reading the
// commits on GitHub, not from a run of the miner; the comment above each
// block says what a human finds there.
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, test } from 'node:test';
import type { GitHubApi, GitHubWrite } from '../src/github.ts';
import { notCovered, type OpenIssue, planIssue, publishIssue, run, weekTitle } from '../src/mine-issue.ts';
import { stateFromReport } from '../src/mine-report.ts';
import { advance, minedSources, readStates, report } from '../src/mine-run.ts';
import { type MiningState, type MiningStates, STATE_PATH } from '../src/mine-trunk.ts';

const ROOT = resolve(import.meta.dirname, '../..');
const FIXTURES = join(import.meta.dirname, 'fixtures/mining');

type Json = Record<string, unknown>;
const isRecord = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);

/** The recorded responses of the named fixtures; an unrecorded path fails. */
function replay(...files: string[]): GitHubApi & { asked: string[] } {
  const responses = new Map<string, unknown>();
  for (const file of files) {
    const body: unknown = JSON.parse(readFileSync(join(FIXTURES, file), 'utf8'));
    for (const [path, value] of Object.entries(isRecord(body) ? body : {})) responses.set(path, value);
  }
  const asked: string[] = [];
  const api = (path: string): Promise<unknown> => {
    asked.push(path);
    return responses.has(path) ? Promise.resolve(responses.get(path)) : Promise.reject(new Error(`unrecorded ${path}`));
  };
  return Object.assign(api, { asked });
}

/** A scratch root with the repository's rules and skills and its own state. */
function scratch(states: MiningStates): string {
  const root = mkdtempSync(join(tmpdir(), 'mine-replay-'));
  for (const dir of ['rules', 'skills']) symlinkSync(join(ROOT, dir), join(root, dir));
  mkdirSync(join(root, 'docs'));
  writeFileSync(join(root, STATE_PATH), `${JSON.stringify(states, null, 2)}\n`);
  return root;
}

const week = (file: string, source: string, since: string, until: string): Promise<string> =>
  report({ root: ROOT, api: replay(file), source, since, until });

const section = (text: string, title: string): string => text.split(`\n## ${title}\n`)[1]?.split('\n## ')[0] ?? '';
const group = (text: string, skill: string, title: string): string =>
  section(text, skill).split(`### ${title}`)[1]?.split('\n### ')[0] ?? '';
const shas = (text: string): string[] => Array.from(text.matchAll(/\[([0-9a-f]{8})\]\(/gu), (m) => m[1] ?? '');
/** Commits listed as read, and the ones without a delta, of one source. */
function commits(text: string, source: string): { read: string[]; quiet: string[] } {
  const part = section(text, 'Commits').split(`### ${source}\n`)[1]?.split('\n### ')[0] ?? '';
  const [listed = '', quiet = ''] = part.split('Without a delta: ');
  return {
    read: shas(
      listed
        .split('\n')
        .filter((l) => l.startsWith('- ['))
        .join('\n'),
    ),
    quiet: shas(quiet),
  };
}
const at = (sha: string, date: string): MiningState => ({ last_sha: sha, last_date: date });
const marked = (states: MiningStates): string => `report\n<!-- mine-trunk-state: ${JSON.stringify(states)} -->\n`;
/** The committer date of a listed commit. */
function dateOf(c: unknown): string {
  const commit = isRecord(c) ? c.commit : undefined;
  const committer = isRecord(commit) ? commit.committer : undefined;
  return isRecord(committer) && typeof committer.date === 'string' ? committer.date : '';
}
/** An API without the label: every GET fails. */
const missing: GitHubApi = () => Promise.reject(new Error('HTTP 404'));
const items = (text: string): string[] => text.split('\n').filter((l) => l.startsWith('- '));

describe('shopware 2026-10-13..2026-10-19, the WP8 window', () => {
  const text = week('shopware-2026-10-13..2026-10-19.json', 'shopware', '2026-10-13', '2026-10-19');

  // The hand pass found five commits. #21541 adds the BC and HTTP cache
  // guidelines, #21660 a PHPStan rule, #21177 touches the rule CORE-015
  // cites, d10e3c4f the check ARCH-004 cites. Three commits change only
  // classes nobody cites or prose.
  test('reads the nine commits with a change and lists the other three as quiet', async () => {
    const { read, quiet } = commits(await text, 'shopware');
    for (const sha of ['f2bf3794', '75b0a495', '190d734b', '8dc74f24', '7ad011f1']) assert.ok(read.includes(sha), sha);
    // 0e782aa7 is #21660, 0fa3e10a #21541, f0e46ffa #21177.
    assert.deepEqual(read.toSorted(), [
      '0e782aa7',
      '0fa3e10a',
      '190d734b',
      '75b0a495',
      '7ad011f1',
      '8dc74f24',
      'd10e3c4f',
      'f0e46ffa',
      'f2bf3794',
    ]);
    assert.deepEqual(quiet.toSorted(), ['00689309', '36e19f9d', '53a6cceb']);
  });
  test('#21660 adds DeprecatedEntityConstructionRule, which no rule cites', async () => {
    assert.match(
      section(await text, 'Unmapped'),
      /^- Rule class `DeprecatedEntityConstructionRule` \(phpstan\) added \(\[0e782aa7\]/mu,
    );
  });
  test('#21177 changes BCChangeAttributeUsageRule, filed under CORE-015; its other classes stay quiet', async () => {
    const t = await text;
    assert.match(
      group(t, 'sw-core-development', 'CORE-015'),
      /Matched by `enforced_by`\.\n\n- Rule class `BCChangeAttributeUsageRule` \(phpstan\) modified \(\[f0e46ffa\]/u,
    );
    for (const name of [
      'ComposerVersionConstraints',
      'InvalidFileNameCharacters',
      'MissingUnitTests',
      'ServiceDefinitionRule',
    ]) {
      assert.doesNotMatch(t, new RegExp(name, 'u'), name);
    }
  });
  // DeprecatedFrameworkMethodPattern (#21139) and DeprecatedExceptionPattern
  // (#21400) are patterns DeprecatedMethodsThrowDeprecationRule reads, and
  // NativeTimeReadHelper (#21177) a helper: none of them is a new rule.
  test('helper classes next to the rules are no rule classes', async () => {
    const t = await text;
    for (const name of ['DeprecatedFrameworkMethodPattern', 'DeprecatedExceptionPattern', 'NativeTimeReadHelper']) {
      assert.doesNotMatch(t, new RegExp(name, 'u'), name);
    }
    for (const sha of ['7ad011f1', '8dc74f24', '0e782aa7']) {
      assert.match(
        group(t, 'sw-core-development', 'CORE-022'),
        new RegExp(`DeprecatedMethodsThrowDeprecationRule.*${sha}`, 'u'),
      );
    }
  });
  test('ends at the trunk head of 2026-10-19, where the hand pass ended', async () => {
    assert.deepEqual(stateFromReport(await text), {
      shopware: { last_sha: '219491014944c6b6463cf6426c7001adea8dae0d', last_date: '2026-10-19T19:45:03Z' },
    });
  });
});

describe('shopware 2026-10-05..2026-10-11', () => {
  const text = week('shopware-2026-10-05..2026-10-11.json', 'shopware', '2026-10-05', '2026-10-11');

  // #21166 rewrites a bullet of the UX review persona: new admin snippet
  // keys need en.json and de.json, no longer en-GB and de-DE. A review rule
  // the review skills learn from; before the replay it went unread.
  test('a changed review persona bullet reaches both review skills', async () => {
    const t = await text;
    for (const skill of ['sw-pr-review', 'sw-extension-review']) {
      const noRule = group(t, skill, 'No rule yet');
      assert.match(
        noRule,
        /- Removed agent skill bullet in `\.agents\/skills\/sw-review\/personas\/ux\.md`: .*`en-GB`/u,
      );
      assert.match(
        noRule,
        /- Added agent skill bullet in .*personas\/ux\.md`: .*`en\.json` and `de\.json`.*\[52d5908b\]/u,
      );
    }
    assert.ok(commits(t, 'shopware').read.includes('52d5908b'));
  });
  // #20863 rewrites the feature flag section of the PHPUnit skill and the
  // "two majors" section of the feature flag guideline; #20840 adds a skill
  // bullet and a Danger rule against traits in unit tests; #21227 a PHPStan
  // rule against reflection in unit tests; #20482 a guideline section on
  // runtime guards. #20305 only touches tagged-service-contracts.php.
  test('reads five commits; #20305 touches no rule class', async () => {
    const { read, quiet } = commits(await text, 'shopware');
    assert.deepEqual(read, ['4a5a519c', '52d5908b', '0b0a7241', 'c64d7402', 'c81123dc']);
    assert.deepEqual(quiet, ['fcd9b687']);
  });
  test('new rules and guideline sections nobody cites are the backlog', async () => {
    assert.deepEqual(
      items(section(await text, 'Unmapped')).map((l) => l.slice(2).replace(/ \(\[.*$/u, '')),
      [
        'Removed guideline heading in `coding-guidelines/core/feature-flags.md`: `## While two majors are in flight`',
        'Added guideline heading in `coding-guidelines/core/feature-flags.md`: `## Major CI`',
        'Rule class `TraitUsageInNewUnitTests` (danger) added',
        'Added guideline heading in `coding-guidelines/administration/feature-flags-and-deprecations.md`: `### Runtime guards`',
      ],
    );
  });
  test('#21227 adds NoReflectionInUnitTestsRule, filed under TEST-012', async () => {
    assert.match(
      group(await text, 'sw-testing', 'TEST-012'),
      /- Rule class `NoReflectionInUnitTestsRule` \(phpstan\) added \(\[c64d7402\]/u,
    );
  });
  test('the feature flag bullet lands on the sw-testing reference that holds the flag rules', async () => {
    const t = await text;
    assert.match(
      group(t, 'sw-testing', '`references/test-shape-and-flags.md`'),
      /- Removed agent skill bullet .*feature-flag state.*\[4a5a519c\][^]*- Added agent skill bullet .*feature-flag state.*\[4a5a519c\]/u,
    );
    assert.match(group(t, 'sw-testing', 'No rule yet'), /- Added agent skill bullet .*through a trait.*\[0b0a7241\]/u);
  });
});

describe('shopware 2026-09-28..2026-10-04', () => {
  const text = week('shopware-2026-09-28..2026-10-04.json', 'shopware', '2026-09-28', '2026-10-04');

  // Six new PHPStan rules, two guideline sections and three bullets of the
  // PHP skill; 00e31c8e changes StoreApiRouteExtensionRule, which ARCH-004
  // cites. Three commits only touch rule classes nobody cites
  // (NoCreateMockWithoutExpectationsRule, DomainExceptionRule) or no rule
  // class at all.
  test('reads nine commits and lists three as quiet', async () => {
    const { read, quiet } = commits(await text, 'shopware');
    assert.deepEqual(read, [
      '61184ef8',
      '49a53706',
      'd1d87bb0',
      '09faff0f',
      '013305a1',
      '06ca9e60',
      '00e31c8e',
      '738a0642',
      '4ac77655',
    ]);
    assert.deepEqual(quiet, ['71acb1c0', 'f5f124a5', '5e9b5c87']);
  });
  test('changes to cited checks land under their rules', async () => {
    const t = await text;
    for (const id of ['CORE-012', 'CORE-022']) {
      assert.match(
        group(t, 'sw-core-development', id),
        /DeprecatedMethodsThrowDeprecationRule` \(phpstan\) modified \(\[61184ef8\]/u,
      );
    }
    // #21157 extends InternalClassRule to compiler passes. TEST-010 cites
    // the rule for test classes, so the change is filed there: the check a
    // rule relies on changed, even though this change is about another use.
    assert.match(group(t, 'sw-testing', 'TEST-010'), /InternalClassRule` \(phpstan\) modified \(\[4ac77655\]/u);
  });
  // #20815 (StoreApiRouteExtensionRule) lands under ARCH-004 and #20830
  // (NoFeatureSkipInUnitTestsRule) under TEST-006, since both rules cite
  // the check. The other new checks are a catalog gap, reported as such.
  test('new checks land under the rule that cites them; the rest are unmapped', async () => {
    const t = await text;
    assert.match(group(t, 'sw-architecture', 'ARCH-004'), /Rule class `StoreApiRouteExtensionRule` \(phpstan\) added/u);
    assert.match(group(t, 'sw-testing', 'TEST-006'), /Rule class `NoFeatureSkipInUnitTestsRule` \(phpstan\) added/u);
    const unmapped = items(section(t, 'Unmapped')).map((l) => l.slice(2).replace(/ \(\[.*$/u, ''));
    assert.deepEqual(unmapped, [
      'Added guideline heading in `coding-guidelines/core/extendability.md`: `#### Extension events`',
      'Rule class `FeatureFlagVersionRule` (phpstan) added',
      'Rule class `NoUnreachableAssertionAfterExpectExceptionRule` (phpstan) added',
      'Added guideline heading in `coding-guidelines/core/feature-flags.md`: `### Using flags for services`',
      'Rule class `DeprecatedServiceDefinitionFeatureTagRule` (phpstan) added',
      'Rule class `DeprecatedServiceFeatureTagRule` (phpstan) added',
      'Added guideline heading in `coding-guidelines/core/internal.md`: `## Compiler passes`',
    ]);
  });
  test('the PHP skill bullets go to sw-architecture', async () => {
    const noRule = items(group(await text, 'sw-architecture', 'No rule yet'));
    assert.equal(noRule.length, 4);
    assert.equal(noRule.filter((l) => l.includes('[d1d87bb0]')).length, 3);
    assert.match(noRule.find((l) => l.includes('[4ac77655]')) ?? '', /compiler pass/u);
  });
});

describe('php-modernization 2026-09-28..2026-10-04', () => {
  const text = week('php-modernization-2026-09-28..2026-10-04.json', 'php-modernization', '2026-09-28', '2026-10-04');

  // The repository merges pull requests with merge commits. 8f3a86b7 merges
  // main into a feature branch; its diff against the first parent repeats
  // 2132c17a, which is listed on its own.
  test('a merge commit is not read again', async () => {
    const t = await text;
    assert.doesNotMatch(t, /8f3a86b7/u);
    assert.equal(t.match(/Finding Stale Baseline Entries` \(\[/gu)?.length, 1);
  });
  // 2132c17a adds a section and a numbered step; the `# ...` lines and the
  // `- /absolute/path` item are inside ```neon and ```bash blocks, and the
  // removed `# Gradually fix errors` line was inside a block that started
  // before the hunk. 6ff3d682 adds SPDX lines to the frontmatter and HTML
  // comments. 0ee0a10c, 493511ae and a79d45d0 change only CHANGELOG.md and
  // fixtures/README.md, outside the watched `skills/`.
  test('only prose under skills/ counts: no code block lines, frontmatter, change log or README', async () => {
    const t = await text;
    assert.deepEqual(
      items(group(t, 'sw-php-foundation', 'No rule yet')).map((l) =>
        l.replace(/^- (Added|Removed) line in `[^`]+`: /u, '$1 ').replace(/ \(\[.*$/u, ''),
      ),
      [
        'Added `` ### `$` accepts a trailing newline — anchor validation with `\\z` ``',
        'Removed `` ### `$` accepts a trailing newline — anchor validation with `\\z` ``',
        'Added `` ### `$` accepts a trailing newline — anchor validation with `\\A…\\z` ``',
        'Removed `Re-generate baseline for remaining unfixable entries`',
        'Added `Remove the entries the fixes made stale (see Finding Stale Baseline Entries) instead of regenerating`',
        'Added `### Finding Stale Baseline Entries`',
        'Added `## Value Objects from Database Rows`',
      ],
    );
    for (const noise of [
      'Gradually fix errors',
      '/tmp/phpstan-stale',
      '/absolute/path',
      'SPDX',
      'PM-05',
      'skill_version',
    ]) {
      assert.doesNotMatch(t, new RegExp(noise, 'u'), noise);
    }
    assert.match(section(t, 'Unmapped'), /^None\.$/mu);
  });
  test('reads four commits; the rest change scripts, prose or files outside skills/', async () => {
    const { read, quiet } = commits(await text, 'php-modernization');
    assert.deepEqual(read, ['e55de9c7', '59f11024', '2132c17a', 'b1350380']);
    assert.deepEqual(quiet, [
      '0ee0a10c',
      '493511ae',
      '6ff3d682',
      'a79d45d0',
      '1dc46a9f',
      '6dd66541',
      '950e141a',
      '4f05f3b2',
    ]);
  });
});

describe('php-modernization after a state at 9e0e56e1 (2026-10-01 07:48)', () => {
  // On 2026-10-01 main got 9e0e56e1 (merge of #154) at 07:48. #155 was
  // merged at 08:28 with two commits dated 07:14 and 07:29. A pass that
  // stopped at 9e0e56e1 has not read them, but their dates lie before it.
  const state = {
    'php-modernization': { last_sha: '9e0e56e1b81f67ebda54af7d90b4cbd5972c9302', last_date: '2026-10-01T07:48:10Z' },
  };
  const now = '2026-10-05T05:00:00Z';
  const file = 'php-modernization-state-9e0e56e1..2026-10-05.json';

  test('the commit range finds the commits a pull request merged later, dated before the state', async () => {
    const t = await report({ root: scratch(state), api: replay(file), source: 'php-modernization', now });
    const { read, quiet } = commits(t, 'php-modernization');
    assert.deepEqual(read, ['b1350380']);
    assert.deepEqual(quiet, ['4f05f3b2']);
    assert.match(group(t, 'sw-php-foundation', 'No rule yet'), /`## Value Objects from Database Rows` \(\[b1350380\]/u);
    assert.equal(stateFromReport(t)['php-modernization']?.last_sha, 'cc996e20f7a1f032944db15a0745c0101965cf51');
  });
  test('without the compare API it falls back to dates, says so, and misses them', async () => {
    const api = replay(file);
    // GitHub lists by committer date: from the state on, only the merge
    // commit 8f3a86b7 (07:49) is in the window, and the miner skips merges.
    const byDate: GitHubApi = async (path) => {
      if (path.includes('/compare/')) throw new Error('HTTP 404');
      const listed = path.replace('since=2026-10-01T07%3A48%3A10Z', 'since=2026-10-01T07%3A14%3A52Z');
      if (listed === path) return api(path);
      const listing = await api(listed);
      return Array.isArray(listing)
        ? listing.filter((c) => dateOf(c) >= state['php-modernization'].last_date)
        : listing;
    };
    const t = await report({ root: scratch(state), api: byDate, source: 'php-modernization', now });
    assert.match(
      section(t, 'Commits'),
      /Note: could not compare 9e0e56e1 with cc996e20 \(HTTP 404\); read by commit date instead\./u,
    );
    assert.match(section(t, 'Commits'), /No commit with a delta\./u);
  });
  test('/mined then moves the state to the report head, never past it', async () => {
    const root = scratch(state);
    const t = await report({ root, api: replay(file), source: 'php-modernization', now });
    advance(root, t);
    assert.deepEqual(readStates(root), {
      'php-modernization': { last_sha: 'cc996e20f7a1f032944db15a0745c0101965cf51', last_date: '2026-10-01T22:14:26Z' },
    });
  });
});

describe('ai-coding-tools 2026-09-01..2026-09-07', () => {
  const text = week('ai-coding-tools-2026-09-01..2026-09-07.json', 'ai-coding-tools', '2026-09-01', '2026-09-07');

  // #142 adds the code-migration plugin with an XML-to-PHP skill; #177 and
  // #180 rework test-writing skills and remove two rule files; #170 edits
  // dev-tooling and test-writing docs. #171 and #172 change dev-tooling
  // code, its change log and prose in docs/reference.md only.
  test('reads four commits; the two that only touch code, prose and the change log are quiet', async () => {
    const { read, quiet } = commits(await text, 'ai-coding-tools');
    assert.deepEqual(read, ['9adaf09e', '0b39f0a8', '07e21489', '46569de9']);
    assert.deepEqual(quiet, ['d7b5ce34', 'a80b8421']);
  });
  test('each plugin reaches the skill that learns from it; nothing outside the watched plugins', async () => {
    const t = await text;
    assert.match(
      group(t, 'sw-plugin-development', 'No rule yet'),
      /code-migration\/skills\/xml-config-migrating\/SKILL\.md`: .*\[0b39f0a8\]/u,
    );
    assert.match(
      group(t, 'sw-testing', 'No rule yet'),
      /- Removed line in `plugins\/test-writing\/rules\/convention\/CONV-007\.md`/u,
    );
    assert.match(group(t, 'sw-podman-dev', 'No rule yet'), /plugins\/dev-tooling\/AGENTS\.md/u);
    assert.doesNotMatch(t, /CHANGELOG\.md/u, 'release notes restate the commit');
    assert.doesNotMatch(t, /plugins\/shopware-env\//u, 'not a watched path');
    assert.doesNotMatch(t, /line in `README\.md`/u, 'the repository README is not watched');
    assert.match(section(t, 'Unmapped'), /^None\.$/mu);
  });
});

describe('every source over 2026-10-13..2026-10-19', () => {
  const files = [
    'shopware-2026-10-13..2026-10-19.json',
    'ai-coding-tools-2026-10-13..2026-10-19.json',
    'php-modernization-2026-10-13..2026-10-19.json',
    'shopware-cli-2026-10-13..2026-10-19.json',
    'fos-agent-skills-2026-10-13..2026-10-19.json',
  ];
  const repo = 'acme/skills-library';
  // Last week's issue, read up to 2026-10-12 in two sources: covered.
  const behind = at('a'.repeat(40), '2026-10-12T00:00:00Z');
  const issues: OpenIssue[] = [
    { number: 5, title: 'Drift: week of 2026-10-12', body: marked({ shopware: behind, 'php-modernization': behind }) },
  ];
  const withIssues =
    (api: GitHubApi): GitHubApi =>
    (path) =>
      path === `repos/${repo}/issues?labels=trunk-drift&state=open&per_page=100&page=1`
        ? Promise.resolve(issues)
        : api(path);

  // shopware-cli adds the extension anonymize skill (#1635); the other
  // upstream sources change scripts only (php-modernization #160) or
  // nothing under their watched paths.
  test('a dry run mines every source and prints the report and the issue plan, writing nothing', async () => {
    const states = readStates(ROOT);
    const root = scratch(states);
    const before = readFileSync(join(root, STATE_PATH), 'utf8');
    const mtime = statSync(join(root, STATE_PATH)).mtimeMs;
    const writes: string[] = [];
    const write: GitHubWrite = (method, path) => {
      writes.push(`${method} ${path}`);
      return Promise.reject(new Error('a dry run must not write'));
    };
    const out = await run({
      root,
      api: withIssues(replay(...files)),
      write,
      repo,
      since: '2026-10-13',
      until: '2026-10-19',
      now: '2026-10-20T05:00:00Z',
      dryRun: true,
    });
    for (const id of ['shopware', 'ai-coding-tools', 'php-modernization', 'shopware-cli', 'fos-agent-skills']) {
      assert.match(out, new RegExp(`^\\| \`${id}\` \\| 2026-10-13 \\|`, 'mu'), id);
    }
    assert.match(out, /^\| `shopware-cli` \| 2026-10-13 \| 1 \| 1 \|/mu);
    assert.match(out, /^\| `php-modernization` \| 2026-10-13 \| 1 \| 0 \|/mu);
    assert.match(
      group(out, 'sw-podman-dev', 'No rule yet'),
      /shopware-cli-extension-anonymize\/SKILL\.md`: `## Confirm this is an extension`/u,
    );
    assert.match(
      out,
      /Dry run, nothing written\. Issue plan:\ncreate issue "Drift: week of 2026-10-19"\nclose #5 as superseded\n$/u,
    );
    assert.deepEqual(writes, []);
    assert.equal(readFileSync(join(root, STATE_PATH), 'utf8'), before);
    assert.equal(statSync(join(root, STATE_PATH)).mtimeMs, mtime);
  });
  test('publishing creates the week issue and closes the one it covers, the state file untouched', async () => {
    const root = scratch(readStates(ROOT));
    const before = readFileSync(join(root, STATE_PATH), 'utf8');
    const writes: { method: string; path: string; body: Json }[] = [];
    const write: GitHubWrite = (method, path, body) => {
      writes.push({ method, path, body });
      return Promise.resolve(path.endsWith('/issues') ? { number: 9 } : {});
    };
    const api = withIssues(replay(...files));
    const labelled: GitHubApi = (path) =>
      path === `repos/${repo}/labels/trunk-drift` ? Promise.resolve({}) : api(path);
    const out = await run({
      root,
      api: labelled,
      write,
      repo,
      since: '2026-10-13',
      until: '2026-10-19',
      now: '2026-10-20T05:00:00Z',
    });
    assert.equal(out, 'issue #9\ncreate issue "Drift: week of 2026-10-19"\nclose #5 as superseded\n');
    assert.deepEqual(
      writes.map((w) => `${w.method} ${w.path}`),
      [`POST repos/${repo}/issues`, `POST repos/${repo}/issues/5/comments`, `PATCH repos/${repo}/issues/5`],
    );
    assert.deepEqual(writes[0]?.body.labels, ['trunk-drift']);
    assert.equal(writes[1]?.body.body, 'Superseded by #9, which covers this window too.');
    assert.deepEqual(writes[2]?.body, { state: 'closed', state_reason: 'not_planned' });
    assert.equal(readFileSync(join(root, STATE_PATH), 'utf8'), before);
  });
});

describe('superseded issues', () => {
  const report2 = marked({ shopware: at('b', '2026-10-26T05:00:00Z'), up: at('u2', '2026-10-25T00:00:00Z') });
  const now = new Date('2026-10-26T05:00:00Z');

  test('the week title is the Monday of the UTC week', () => {
    assert.equal(weekTitle(new Date('2026-10-26T05:00:00Z')), 'Drift: week of 2026-10-26');
    assert.equal(weekTitle(new Date('2026-11-01T23:59:59Z')), 'Drift: week of 2026-10-26');
    assert.equal(weekTitle(new Date('2026-10-25T23:59:59Z')), 'Drift: week of 2026-10-19');
  });
  test('an issue the new report fully covers is closed as superseded', () => {
    const older = {
      number: 3,
      title: 'Drift: week of 2026-10-19',
      body: marked({ shopware: at('a', '2026-10-19T19:45:03Z'), up: at('u1', '2026-10-18') }),
    };
    const plan = planIssue([older], report2, now);
    assert.equal(plan.update, undefined);
    assert.deepEqual(plan.close, [
      { number: 3, comment: 'Superseded by the new issue, which covers this window too.' },
    ]);
    assert.deepEqual(plan.keep, []);
  });
  test('an issue with a source the new report lacks, or reaching further, stays open', () => {
    const lacks = { number: 4, title: 'x', body: marked({ gone: at('g', '2026-10-01T00:00:00Z') }) };
    const further = { number: 5, title: 'y', body: marked({ shopware: at('c', '2026-10-27T00:00:00Z') }) };
    const noMarker = { number: 6, title: 'z', body: 'hand-written' };
    const plan = planIssue([further, lacks, noMarker], report2, now);
    assert.deepEqual(plan.close, []);
    assert.deepEqual(plan.keep, [
      { number: 4, why: 'gone is not in the new report' },
      { number: 5, why: 'shopware ends earlier in the new report' },
      { number: 6, why: 'it has no state marker' },
    ]);
  });
  test("this week's issue is updated in place, not closed", () => {
    const current = {
      number: 7,
      title: 'Drift: week of 2026-10-26',
      body: marked({ shopware: at('a', '2026-10-19') }),
    };
    const plan = planIssue([current], report2, now);
    assert.equal(plan.update, 7);
    assert.deepEqual(plan.close, []);
  });
  test('a date-only state covers its whole day', () => {
    assert.equal(notCovered({ s: at('x', '2026-10-19') }, { s: at('y', '2026-10-19T23:00:00Z') }), undefined);
    assert.match(
      notCovered({ s: at('x', '2026-10-19T22:00:00Z') }, { s: at('y', '2026-10-19') }) ?? '',
      /ends earlier/u,
    );
  });
  test('publishing updates the open issue of the week and creates the label once', async () => {
    const writes: string[] = [];
    const write: GitHubWrite = (method, path) => {
      writes.push(`${method} ${path}`);
      return Promise.resolve({});
    };
    const plan = planIssue([{ number: 7, title: 'Drift: week of 2026-10-26', body: '' }], report2, now);
    assert.equal(await publishIssue(missing, write, 'o/r', plan), 7);
    assert.deepEqual(writes, ['POST repos/o/r/labels', 'PATCH repos/o/r/issues/7']);
  });
});

describe('/mined', () => {
  const old = {
    shopware: at('s0', '2026-10-12T00:00:00Z'),
    up: at('u0', '2026-10-12T00:00:00Z'),
    other: at('o0', '2026-10-01T00:00:00Z'),
  };
  const issue = `report\n<!-- mine-trunk-state: ${JSON.stringify({ shopware: at('s1', '2026-10-19T19:45:03Z'), up: at('u1', '2026-10-18T00:00:00Z') })} -->\n`;

  test('names the sources after the command, or none for all of them', () => {
    assert.equal(minedSources('/mined'), undefined);
    assert.equal(minedSources('/mined\n\nall read, thanks'), undefined);
    assert.deepEqual(minedSources('/mined shopware  up\nrest later'), ['shopware', 'up']);
    assert.throws(() => minedSources('looks /mined to me'), /does not start with \/mined/u);
  });
  test('a bare /mined moves every source of the report and keeps the others', () => {
    const root = scratch(old);
    advance(root, issue);
    assert.deepEqual(readStates(root), {
      shopware: at('s1', '2026-10-19T19:45:03Z'),
      up: at('u1', '2026-10-18T00:00:00Z'),
      other: old.other,
    });
  });
  test('/mined with names moves only those sources', () => {
    const root = scratch(old);
    advance(root, issue, minedSources('/mined up'));
    assert.deepEqual(readStates(root), { ...old, up: at('u1', '2026-10-18T00:00:00Z') });
  });
  test('a name the report has no state for fails and writes nothing', () => {
    const root = scratch(old);
    const before = readFileSync(join(root, STATE_PATH), 'utf8');
    assert.throws(() => advance(root, issue, ['other']), /the report records no state for other/u);
    assert.equal(readFileSync(join(root, STATE_PATH), 'utf8'), before);
  });
  test('/mined on an older, superseded issue never moves a state back', () => {
    const ahead = { shopware: at('s2', '2026-10-26T05:00:00Z'), up: at('u0', '2026-10-12T00:00:00Z') };
    const root = scratch(ahead);
    advance(root, issue);
    assert.deepEqual(readStates(root), { shopware: ahead.shopware, up: at('u1', '2026-10-18T00:00:00Z') });
  });
});
