import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, test } from 'node:test';
import { gzipSync } from 'node:zlib';
import { readJson, snapshotPath, writeJson } from '../src/store.ts';
import { isNode } from '../src/node.ts';
import { cli, cliResult, fixtureRepo, git } from './workflow-fixture.ts';

const temp = mkdtempSync(join(tmpdir(), 'census-workflows-'));
after(() => {
  rmSync(temp, { recursive: true, force: true });
});
let serial = 0;
const file = 'src/Core/Framework/DeliveryService.php';
const source = `<?php declare(strict_types=1);
namespace Shopware\\Core\\Framework;
interface DeliveryContract { public function deliver(): void; }
abstract class DeliveryService implements DeliveryContract {
    abstract public function deliver(): void;
    public function dispatch(): void {}
    protected function prepare(): void {}
    private function secret(): void {}
}
trait DeliveryTrait { public function mix(): void {} }
enum DeliveryState: string { case Draft = 'draft'; }
`;
interface CensusFixture {
  dir: string;
  repo: string;
  cache: string;
  census: string;
  snapshot: string;
  raw: string;
  classes: { name: string; path: string; kind: string | undefined }[];
  units: { name: string; path: string; kind: string; language: string }[];
}
function setup(): CensusFixture {
  const dir = join(temp, String(++serial));
  const repo = fixtureRepo(dir, [{ tag: 'v6.7.0.0', files: { [file]: source } }]);
  const cache = join(dir, 'cache');
  const census = join(dir, 'census');
  const snapshot = snapshotPath(cache, 'v6.7.0.0', git(repo, 'rev-parse', 'v6.7.0.0'));
  mkdirSync(dirname(snapshot), { recursive: true });
  cli('build', ['--repo', repo, '--ref', 'v6.7.0.0', '--out', snapshot]);
  const raw = join(census, 'refs/v6.7.0.0/raw');
  mkdirSync(raw, { recursive: true });
  const classes = ['DeliveryContract', 'DeliveryService', 'DeliveryTrait', 'DeliveryState'].map((name, index) => ({
    name: `Shopware\\Core\\Framework\\${name}`,
    path: file,
    kind: ['interface', 'class', 'trait', 'enum'][index],
  }));
  const units = [
    'DeliveryService::DISPATCH',
    'DeliveryService::prepare',
    'DeliveryService::secret',
    'DeliveryTrait::mix',
  ].map((name) => ({ name, path: file, kind: 'method', language: 'php' }));
  return { dir, repo, cache, census, snapshot, raw, classes, units };
}
function save(f: ReturnType<typeof setup>, classes: unknown = f.classes, units: unknown = f.units): void {
  writeFileSync(join(f.raw, 'classes.json.gz'), gzipSync(JSON.stringify({ classes })));
  writeFileSync(join(f.raw, 'units.json.gz'), gzipSync(JSON.stringify({ units })));
}
const args = (f: ReturnType<typeof setup>): string[] => ['--census', f.census, '--cache', f.cache];

test('build output agrees with census classes and concrete public/protected methods', () => {
  const f = setup();
  const noise = [
    { name: 'TestClass', path: 'tests/TestClass.php', kind: 'class' },
    { name: 'NestedTest', path: 'src/Core/Test/NestedTest.php', kind: 'class' },
    { name: 'Frontend', path: 'src/Administration/frontend.js', kind: 'class' },
  ];
  save(
    f,
    [...f.classes, ...noise],
    [...f.units, { name: 'not-a-php-method', kind: 'function', language: 'javascript' }],
  );
  const output = cli('census-check', args(f));
  assert.match(output, /ok {3}v6\.7\.0\.0: classes 4 vs 4/u);
  assert.match(output, /methods with a body missing in census 0/u);
  assert.match(output, /1 tags checked, 0 with differences/u);
});
test('class differences in both directions and missing concrete methods fail with bounded details', () => {
  const f = setup();
  save(
    f,
    [...f.classes.slice(1), { name: 'Shopware\\Core\\Framework\\Extra', path: file, kind: 'class' }],
    f.units.filter((unit) => unit.name !== 'DeliveryService::DISPATCH'),
  );
  const output = cli('census-check', [...args(f), '--details', '1'], 1);
  assert.match(output, /DIFF.*only census 1, only index 1/u);
  assert.match(output, /methods with a body missing in census 1/u);
  assert.match(output, /only census: .*Extra/u);
  assert.match(output, /only index: .*DeliveryContract/u);
  assert.match(output, /method not in census: .*DeliveryService::dispatch\(\)/u);
  assert.match(output, /1 tags checked, 1 with differences/u);
  assert.doesNotMatch(
    cli('census-check', [...args(f), '--details', '0'], 1),
    /  only census:|  only index:|  method not in census:/u,
  );
});
test('missing comparable data and invalid detail limits are errors rather than empty successes', () => {
  const f = setup();
  save(f);
  for (const details of ['-1', 'NaN', '1.5', '']) {
    const result = cliResult('census-check', [...args(f), `--details=${details}`]);
    assert.equal(result.status, 2);
    assert.match(result.stderr, /non-negative integer/u);
  }
  const result = cliResult('census-check', ['--census', f.census, '--cache', join(f.dir, 'absent-cache')]);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /no comparable/u);
  assert.equal(cliResult('census-check', []).status, 2);
});
test('malformed census records, gzip data and partial snapshots cannot pass a comparison', () => {
  const f = setup();
  save(f, 'not-a-list');
  assert.equal(cliResult('census-check', args(f)).status, 2);
  save(f);
  writeFileSync(join(f.raw, 'units.json.gz'), 'not gzip');
  assert.equal(cliResult('census-check', args(f)).status, 2);
  save(f);
  const snapshot = readJson(f.snapshot);
  assert.ok(isNode(snapshot));
  writeJson(f.snapshot, { ...snapshot, failed: ['src/Broken.php'] });
  const result = cliResult('census-check', args(f));
  assert.equal(result.status, 2);
  assert.match(result.stderr, /parse failures/u);
  writeJson(f.snapshot, {});
  assert.equal(cliResult('census-check', args(f)).status, 2);
});
