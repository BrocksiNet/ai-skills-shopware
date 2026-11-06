// Workflow contracts: source at Git refs -> cached timeline -> extension facts and API diff.
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { isNode, type Node } from '../src/node.ts';
import { loadSnapshot, loadTimeline } from '../src/store.ts';
import { snapshotAt } from '../src/timeline.ts';

import { write, git, commit, cli, cliResult, objectJson } from './workflow-fixture.ts';
const temp = mkdtempSync(join(tmpdir(), 'api-workflows-'));
after(() => {
  rmSync(temp, { recursive: true, force: true });
});
let serial = 0;
const phpPath = 'src/Core/Framework/VersionedService.php';
const twigPath = 'src/Storefront/Resources/views/storefront/base.html.twig';
const php = (methods: string): string => `<?php declare(strict_types=1);
namespace Shopware\\Core\\Framework;
class VersionedService {public function stable(): void {} ${methods}}
`;
function setup(): { dir: string; repo: string; extension: string; cache: string; index: string } {
  const dir = join(temp, String(++serial));
  const repo = join(dir, 'repo');
  mkdirSync(repo, { recursive: true });
  git(repo, 'init', '-q', '--initial-branch=main');
  write(repo, phpPath, php(''));
  write(repo, twigPath, '{% block base_content %}old{% endblock %}');
  commit(repo);
  git(repo, 'tag', 'v6.7.0.0');
  write(repo, phpPath, php('public function refresh(): void {}'));
  write(repo, twigPath, '{% block base_main %}new{% endblock %}');
  commit(repo);
  git(repo, 'tag', 'v6.7.1.0');
  git(repo, 'tag', 'v6.8.0.0-rc1');
  const extension = join(dir, 'extension');
  write(extension, 'composer.json', JSON.stringify({ require: { 'shopware/core': '>=6.7 <6.8' } }));
  write(
    extension,
    'src/Subscriber.php',
    `<?php
use Shopware\\Core\\Framework\\VersionedService;
class Subscriber {
 public function __construct(private readonly VersionedService $service) {}
 public function run(): void {$this->service->refresh();}
}
`,
  );
  write(
    extension,
    'src/Resources/views/storefront/base.html.twig',
    "{% sw_extends '@Storefront/storefront/base.html.twig' %}\n{% block base_content %}extension{% endblock %}",
  );
  return { dir, repo, extension, cache: join(dir, 'cache'), index: join(dir, 'index.json.gz') };
}
function timelineArgs(f: ReturnType<typeof setup>): string[] {
  return ['--repo', f.repo, '--from', '6.7.0.0', '--cache', f.cache, '--out', f.index];
}

function verifyExtensionFacts(extension: string, index: string): void {
  const report = objectJson(cli('api-facts', [extension, '--index', index, '--no-fetch', '--json']));
  assert.deepEqual(report.releases, ['6.7.0.0', '6.7.1.0']);
  assert.deepEqual(report.failed, []);
  assert.ok(Array.isArray(report.facts));
  const missing = report.facts.filter((fact: unknown): fact is Node => isNode(fact) && fact.kind === 'missing');
  assert.deepEqual(
    missing.find((fact) => fact.target === 'php:Shopware\\Core\\Framework\\VersionedService::refresh()')?.releases,
    [['6.7.0.0', '6.7.0.0']],
  );
  assert.deepEqual(
    missing.find((fact) => fact.target === 'storefront:@Storefront/storefront/base.html.twig#base_content')?.releases,
    [['6.7.1.0', '6.7.1.0']],
  );
}

function verifyApiDiff(index: string): void {
  const diff = objectJson(
    cli(
      'api-diff',
      [
        '--base',
        '6.7.0.0',
        '--head',
        '6.7.1.0',
        '--index',
        index,
        '--surface',
        'php,storefront',
        '--no-fetch',
        '--json',
      ],
      3,
    ),
  );
  assert.ok(Array.isArray(diff.changes));
  assert.ok(
    diff.changes.some(
      (change: unknown) =>
        isNode(change) &&
        change.kind === 'removed' &&
        change.id === 'storefront:@Storefront/storefront/base.html.twig#base_content',
    ),
  );
}

test('build, timeline, facts and diff CLIs compose across PHP and Twig without a Shopware runtime', () => {
  const f = setup();
  // Uncommitted work must not contaminate a release snapshot.
  write(f.repo, phpPath, '<?php this is not valid PHP;');
  const snapshotFile = join(f.dir, 'early.json.gz');
  cli('build', ['--repo', f.repo, '--ref', 'v6.7.0.0', '--out', snapshotFile]);
  const early = loadSnapshot(snapshotFile);
  assert.ok(early);
  assert.deepEqual(early.failed, []);
  assert.ok(early.items.some((item) => item.id === 'php:Shopware\\Core\\Framework\\VersionedService::stable()'));
  assert.ok(!early.items.some((item) => item.id.endsWith('::refresh()')));
  assert.equal(early.sha, git(f.repo, 'rev-parse', 'v6.7.0.0'));
  const header = join(f.dir, 'header.json');
  assert.match(cli('timeline', [...timelineArgs(f), '--index', header]), /2 releases \(2 built, 0 cached\)/u);
  const timeline = loadTimeline(f.index);
  assert.deepEqual(
    timeline.releases.map((release) => release.release),
    ['6.7.0.0', '6.7.1.0'],
  );
  const metadata = objectJson(readFileSync(header, 'utf8'));
  assert.deepEqual(metadata.releases, timeline.releases);
  verifyExtensionFacts(f.extension, f.index);
  verifyApiDiff(f.index);
});

test('cached tags are reused while a moving trunk is rebuilt by commit identity', () => {
  const f = setup();
  const args = [...timelineArgs(f), '--trunk', 'HEAD'];
  assert.match(cli('timeline', args), /3 releases \(3 built, 0 cached\)/u);
  const first = loadTimeline(f.index);
  assert.match(cli('timeline', args), /3 releases \(0 built, 3 cached\)/u);
  assert.deepEqual(loadTimeline(f.index), first);
  write(f.repo, phpPath, php('public function refresh(): void {} public function latestOnly(): void {}'));
  commit(f.repo);
  assert.match(cli('timeline', args), /3 releases \(1 built, 2 cached\)/u);
  const updated = loadTimeline(f.index);
  assert.equal(updated.releases.at(-1)?.sha, git(f.repo, 'rev-parse', 'HEAD'));
  assert.notEqual(updated.releases.at(-1)?.sha, first.releases.at(-1)?.sha);
  const trunk = snapshotAt(updated, 'trunk');
  const release = snapshotAt(updated, '6.7.1.0');
  assert.ok(trunk && release);
  assert.ok(trunk.items.some((item) => item.id.endsWith('::latestOnly()')));
  assert.ok(!release.items.some((item) => item.id.endsWith('::latestOnly()')));
});

test('a partial parse is reported as a failed build and missing index releases fail the CLI', () => {
  const f = setup();
  write(f.repo, 'src/Core/Broken.php', '<?php class {');
  commit(f.repo);
  const output = join(f.dir, 'partial.json.gz');
  cli('build', ['--repo', f.repo, '--ref', 'HEAD', '--out', output], 1);
  const partial = loadSnapshot(output);
  assert.ok(partial);
  assert.deepEqual(partial.failed, ['src/Core/Broken.php']);
  // Use the two known-good tags for the timeline; HEAD is deliberately malformed.
  cli('timeline', timelineArgs(f));
  cli('api-diff', ['--base', '6.5.0.0', '--head', '6.7.1.0', '--index', f.index, '--no-fetch', '--json'], 2);
});

const CONSUMER = `<?php
use Shopware\\Core\\Framework\\VersionedService;
class Consumer {
 public function __construct(private readonly VersionedService $service) {}
 public function run(): void {
 }
}
`;
const PATCH = `diff --git a/src/Consumer.php b/src/Consumer.php
--- a/src/Consumer.php
+++ b/src/Consumer.php
@@ -3,5 +3,6 @@
 class Consumer {
  public function __construct(private readonly VersionedService $service) {}
  public function run(): void {
+  $this->service->refresh();
  }
 }
`;

test('human-readable facts preserve version ranges, locations and an explicit range override', () => {
  const f = setup();
  cli('timeline', timelineArgs(f));
  const text = cli('api-facts', [f.extension, '--index', f.index, '--no-fetch']);
  assert.match(text, /Shopware API this extension uses.*6\.7\.0\.0 … 6\.7\.1\.0/u);
  assert.match(text, /VersionedService::refresh\(\).*6\.7\.0\.0.*src\/Subscriber\.php/u);
  assert.match(text, /base_content.*6\.7\.1\.0/u);
  assert.match(text, /These are facts from the source/u);
  const restricted = objectJson(
    cli('api-facts', [f.extension, '--index', f.index, '--no-fetch', '--json', '--range', '~6.7.1']),
  );
  assert.deepEqual(restricted.releases, ['6.7.1.0']);
  assert.ok(Array.isArray(restricted.facts));
  assert.ok(
    !restricted.facts.some(
      (fact: unknown) => isNode(fact) && fact.target === 'php:Shopware\\Core\\Framework\\VersionedService::refresh()',
    ),
  );
});
test('apply, edited-tree diff and stdin diff agree without modifying the pristine extension', () => {
  const f = setup();
  cli('timeline', timelineArgs(f));
  const pristine = join(f.dir, 'pristine');
  const edited = join(f.dir, 'edited');
  const patch = join(f.dir, 'change.patch');
  for (const dir of [pristine, edited])
    write(dir, 'composer.json', JSON.stringify({ require: { 'shopware/core': '>=6.7 <6.8' } }));
  write(pristine, 'src/Consumer.php', CONSUMER);
  write(
    edited,
    'src/Consumer.php',
    CONSUMER.replace(
      ' public function run(): void {\n',
      ' public function run(): void {\n  $this->service->refresh();\n',
    ),
  );
  write(f.dir, 'change.patch', PATCH);
  const base = ['--index', f.index, '--no-fetch', '--json'];
  const applied = objectJson(cli('api-facts', [pristine, ...base, '--apply', patch]));
  assert.equal(applied.narrowed, true);
  assert.ok(Array.isArray(applied.facts));
  assert.ok(
    applied.facts.some(
      (fact: unknown) => isNode(fact) && typeof fact.target === 'string' && fact.target.endsWith('::refresh()'),
    ),
  );
  const changed = objectJson(cli('api-facts', [edited, ...base, '--diff', patch]));
  const stdin = cliResult('api-facts', [edited, ...base, '--diff', '-'], PATCH);
  assert.equal(stdin.status, 0, stdin.stderr);
  assert.deepEqual(changed.facts, applied.facts);
  assert.deepEqual(objectJson(stdin.stdout).facts, applied.facts);
  assert.equal(readFileSync(join(pristine, 'src/Consumer.php'), 'utf8'), CONSUMER);
});
test('facts CLI reports unavailable analysis and requires a range or composer metadata', () => {
  const f = setup();
  cli('timeline', timelineArgs(f));
  const extension = join(f.dir, 'unknown');
  write(extension, 'src/Unknown.php', '<?php class Unknown {public function run($value) {$value->go();}}');
  const args = [extension, '--index', f.index, '--no-fetch'];
  const missing = cliResult('api-facts', args);
  assert.equal(missing.status, 2);
  assert.match(missing.stderr, /no --range/u);
  const empty = cli('api-facts', [...args, '--range', '>=6.7 <6.8']);
  assert.match(empty, /no version facts/u);
  assert.match(empty, /method calls not checked/u);
  write(extension, 'src/Broken.php', '<?php class {');
  assert.match(cli('api-facts', [...args, '--range', '>=6.7 <6.8']), /not parsed: src\/Broken\.php/u);
  assert.equal(cliResult('api-facts', []).status, 2);
  assert.equal(cliResult('api-facts', [...args, '--diff', 'x', '--apply', 'y']).status, 2);
});
test('human API diffs and invalid surface selections use the same built timeline', () => {
  const f = setup();
  cli('timeline', timelineArgs(f));
  const args = ['--base', '6.7.0.0', '--head', '6.7.1.0', '--index', f.index, '--no-fetch'];
  // A break exits 3; a diff without one exits 0.
  const text = cli('api-diff', [...args, '--surface', 'storefront'], 3);
  assert.match(text, /^Public API from 6\.7\.0\.0 to 6\.7\.1\.0\.\nSummary: 1 breaking change /u);
  assert.match(text, /base_content/u);
  assert.match(cli('api-diff', [...args, '--surface', 'route']), /Summary: 0 breaking changes/u);
  assert.match(cli('api-diff', ['--help']), /Exit code: 0 no breaking change, 3 breaking changes found/u);
  const invalid = cliResult('api-diff', [...args, '--surface', 'not-a-surface']);
  assert.equal(invalid.status, 2);
  assert.match(invalid.stderr, /unknown surface/u);
  assert.equal(cliResult('api-diff', []).status, 2);
});
