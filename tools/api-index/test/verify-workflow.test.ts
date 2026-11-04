import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { isNode, type Node } from '../src/node.ts';
import { cli, cliResult, fixtureRepo, git, objectJson, write } from './workflow-fixture.ts';

const temp = mkdtempSync(join(tmpdir(), 'verify-workflows-'));
after(() => {
  rmSync(temp, { recursive: true, force: true });
});
let serial = 0;
const target = 'php:Shopware\\Core\\Framework\\VersionedService';
const php = (flagged: boolean, extra = ''): string => `<?php declare(strict_types=1);
namespace Shopware\\Core\\Framework;
${
  flagged
    ? `/**
 * @internal
 * @deprecated tag:v6.8.0 reason: Replaced
 * @experimental feature:DELIVERY stableVersion:v6.8.0
 */`
    : ''
}
${flagged ? 'final ' : ''}class VersionedService {
    public function stable(): void {}
    ${extra}
}
`;
function setup(): { dir: string; repo: string; index: string; path: string; report: Node } {
  const dir = join(temp, String(++serial));
  const file = 'src/Core/Framework/VersionedService.php';
  const repo = fixtureRepo(dir, [
    { tag: 'v6.7.0.0', files: { [file]: php(false) } },
    { tag: 'v6.7.1.0', files: { [file]: php(true) } },
    { tag: 'v6.7.2.0', files: { [file]: php(true, 'public function extra(): void {}') } },
  ]);
  const index = join(dir, 'index.json.gz');
  cli('timeline', ['--repo', repo, '--from', '6.7.0.0', '--cache', join(dir, 'cache'), '--out', index]);
  const extension = join(dir, 'extension');
  write(extension, 'composer.json', JSON.stringify({ require: { 'shopware/core': '>=6.7 <6.8' } }));
  write(
    extension,
    'src/UseCore.php',
    `<?php
use Shopware\\Core\\Framework\\VersionedService;
class UseCore extends VersionedService {
    public function run(): void { $this->stable(); }
}
`,
  );
  const report = objectJson(cli('api-facts', [extension, '--index', index, '--no-fetch', '--json']));
  write(dir, 'report.json', JSON.stringify(report));
  return { dir, repo, index, path: join(dir, 'report.json'), report };
}
const args = (f: ReturnType<typeof setup>): string[] => ['--repo', f.repo, '--index', f.index, f.path];
function facts(report: Node): Node[] {
  assert.ok(Array.isArray(report.facts));
  const entries: unknown[] = report.facts;
  assert.ok(entries.every((entry) => isNode(entry)));
  return entries;
}
function replace(f: ReturnType<typeof setup>, report: unknown): void {
  write(f.dir, 'report.json', JSON.stringify(report));
}

test('timeline -> extension facts -> source verifier agrees on class flags and their inherited carriers', () => {
  const f = setup();
  const entries = facts(f.report);
  assert.ok(entries.some((fact) => fact.target === target && fact.kind === 'internal'));
  assert.ok(entries.some((fact) => fact.kind === 'final-extended'));
  const result = cli('verify-facts', args(f));
  assert.match(result, /ok {5}report\.json internal/u);
  assert.match(result, /deprecated v6\.8\.0/u);
  assert.match(result, /experimental v6\.8\.0/u);
  assert.match(result, /wrong 0, manual 0/u);
  assert.match(result, /0 of them without a fact/u);
});
test('a fabricated release boundary is a precision failure rather than a schema error', () => {
  const f = setup();
  const entries = facts(f.report);
  replace(f, {
    ...f.report,
    facts: entries.map((fact) =>
      fact.target === target && fact.kind === 'internal'
        ? Object.assign({}, fact, { releases: [['6.7.2.0', '6.7.2.0']] })
        : fact,
    ),
  });
  const output = cli('verify-facts', args(f), 1);
  assert.match(output, /WRONG.*internal.*6\.7\.1\.0: holds too/u);
  assert.match(output, /wrong 1/u);
});
test('omitting a real class flag is a recall failure', () => {
  const f = setup();
  replace(f, {
    ...f.report,
    facts: facts(f.report).filter((fact) => !(fact.target === target && fact.kind === 'internal')),
  });
  const output = cli('verify-facts', args(f), 1);
  assert.match(output, /MISSED report\.json internal .*VersionedService at 6\.7\.2\.0/u);
  assert.match(output, /1 of them without a fact/u);
});
test('malformed reports and fact ranges cannot be silently filtered into success', () => {
  const f = setup();
  const first = facts(f.report)[0];
  assert.ok(first);
  for (const invalid of [
    {},
    { ...f.report, releases: [] },
    { ...f.report, symbols: ['valid', 1] },
    { ...f.report, facts: [{}] },
    { ...f.report, facts: [{ ...first, kind: 'not-a-fact' }] },
    { ...f.report, facts: [{ ...first, value: 4 }] },
    { ...f.report, facts: [{ ...first, via: false }] },
    { ...f.report, facts: [{ ...first, releases: [] }] },
    { ...f.report, facts: [{ ...first, releases: [[3, 4]] }] },
    { ...f.report, facts: [{ ...first, releases: [['6.7.2.0', '6.7.0.0']] }] },
    { ...f.report, facts: [{ ...first, releases: [['6.7.1.0', 'missing']] }] },
    { ...f.report, releases: ['6.7.0.0', '6.7.0.0'] },
  ]) {
    replace(f, invalid);
    const result = cliResult('verify-facts', args(f));
    assert.equal(result.status, 2, JSON.stringify(invalid));
    assert.match(result.stderr, /verify-facts:/u);
    assert.doesNotMatch(result.stdout, /wrong 0/u);
  }
  write(f.dir, 'report.json', '{');
  assert.equal(cliResult('verify-facts', args(f)).status, 2);
});
test('unknown index releases and unavailable Git refs are source-data errors', () => {
  const f = setup();
  replace(f, { ...f.report, releases: ['absent'], facts: [] });
  const absent = cliResult('verify-facts', args(f));
  assert.equal(absent.status, 2);
  assert.match(absent.stderr, /not in the index/u);
  replace(f, f.report);
  const repo = cliResult('verify-facts', ['--repo', join(f.dir, 'missing-repo'), '--index', f.index, f.path]);
  assert.equal(repo.status, 2);
  assert.match(repo.stderr, /verify-facts:/u);
  git(f.repo, 'tag', '-d', 'v6.7.2.0');
  assert.equal(cliResult('verify-facts', args(f)).status, 2);
  assert.equal(cliResult('verify-facts', []).status, 2);
});
