import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { cli, cliResult, fixtureRepo, git, commit, write } from './workflow-fixture.ts';
import type { KnownBreaks } from '../src/known-breaks.ts';

const temp = mkdtempSync(join(tmpdir(), 'breaks-workflows-'));
after(() => {
  rmSync(temp, { recursive: true, force: true });
});
let serial = 0;
const controller = (names: string[]): string => `<?php declare(strict_types=1);
namespace Shopware\\Core\\Framework;
use Symfony\\Component\\Routing\\Attribute\\Route;
class DeliveryController {
${names
  .map(
    (name) => `    #[Route(path: '/${name}', name: 'api.${name}', methods: ['GET'])]
    public function ${name}(): void {}`,
  )
  .join('\n')}
}`;
interface BreakFixture {
  dir: string;
  repo: string;
  index: string;
  cache: string;
  knownPath: string;
  known: KnownBreaks;
}
function setup(): BreakFixture {
  const dir = join(temp, String(++serial));
  const file = 'src/Core/Framework/DeliveryController.php';
  const repo = fixtureRepo(dir, [
    { tag: 'v6.6.0.0', files: { [file]: controller(['legacy', 'extra', 'future']) } },
    { tag: 'v6.7.0.0', files: { [file]: controller(['future']) } },
    { tag: 'v6.8.0.0', files: { [file]: controller([]) } },
  ]);
  const index = join(dir, 'index.json.gz');
  const cache = join(dir, 'cache');
  const knownPath = join(dir, 'known.json');
  const known: KnownBreaks = {
    majors: [
      { major: '6.7', base: 'v6.6.0.0', head: 'v6.7.0.0', expect: 'removed' },
      { major: '6.8', base: 'v6.7.0.0', head: 'v6.8.0.0', expect: 'removed' },
    ],
    breaks: [
      { major: '6.7', id: 'route:api.legacy', kind: 'route', heading: 'Legacy route removed' },
      { major: '6.7', id: 'route:api.unseen', kind: 'route', heading: 'Unobserved known break' },
      { major: '6.8', id: 'route:api.future', kind: 'route', heading: 'Future route removed' },
    ],
    confirmed: [],
  };
  write(dir, 'known.json', JSON.stringify(known));
  cli('timeline', ['--repo', repo, '--from', '6.6.0.0', '--cache', cache, '--out', index]);
  return { dir, repo, index, cache, knownPath, known };
}
const args = (f: ReturnType<typeof setup>): string[] => ['--known', f.knownPath, '--index', f.index, '--no-fetch'];

test('a built timeline enforces recall and precision at the exact gate boundary', () => {
  const f = setup();
  const at = cli('check-breaks', [...args(f), '--major', '6.7', '--gate', '0.5']);
  assert.match(at, /found 1\/2/u);
  assert.match(at, /right 1\/2/u);
  assert.match(at, /missed: route:api\.unseen/u);
  assert.match(at, /unexplained: route:api\.extra/u);
  assert.match(at, /gate 50\.0 %: passed/u);
  assert.match(cli('check-breaks', [...args(f), '--major', '6.7', '--gate', '0.51'], 1), /failed/u);
  assert.match(cli('check-breaks', [...args(f), '--major', '6.8', '--gate', '1']), /passed/u);
  assert.match(
    cli('check-breaks', [...args(f), '--major', '6.7, 6.8', '--gate', '0.7'], 1),
    /6\.8 \(v6\.7\.0\.0 → v6\.8\.0\.0/u,
  );
});
test('repo/cache and no-fetch index modes report the same selected comparisons', () => {
  const f = setup();
  const index = cli('check-breaks', [...args(f), '--major', '6.8']);
  const repo = cli('check-breaks', ['--known', f.knownPath, '--repo', f.repo, '--cache', f.cache, '--major', '6.8']);
  assert.equal(repo, index);
});
test('invalid thresholds, unknown majors and empty selections are data errors', () => {
  const f = setup();
  for (const gate of ['-1', '1.1', 'NaN', 'Infinity', '']) {
    const result = cliResult('check-breaks', [...args(f), `--gate=${gate}`]);
    assert.equal(result.status, 2);
    assert.match(result.stderr, /between 0 and 1/u);
  }
  for (const major of ['typo', '', '6.7,typo']) {
    const result = cliResult('check-breaks', [...args(f), '--major', major]);
    assert.equal(result.status, 2);
    assert.match(result.stderr, /unknown major/u);
  }
  write(f.dir, 'known.json', JSON.stringify({ ...f.known, majors: [] }));
  const empty = cliResult('check-breaks', args(f));
  assert.equal(empty.status, 2);
  assert.match(empty.stderr, /no majors selected/u);
});
test('malformed known-break data and missing releases do not become quality failures or successes', () => {
  const f = setup();
  write(f.dir, 'known.json', '{}');
  assert.equal(cliResult('check-breaks', args(f)).status, 2);
  write(
    f.dir,
    'known.json',
    JSON.stringify({
      ...f.known,
      majors: [{ ...f.known.majors[0], major: 'missing', base: 'absent', head: 'v6.7.0.0', expect: 'removed' }],
    }),
  );
  const result = cliResult('check-breaks', args(f));
  assert.equal(result.status, 2);
  assert.match(result.stderr, /not in the index/u);
});

test('a source parse failure cannot certify an empty known-break list', () => {
  const f = setup();
  write(f.repo, 'src/Core/Broken.php', '<?php class {');
  commit(f.repo);
  git(f.repo, 'tag', 'v6.9.0.0');
  write(
    f.dir,
    'known.json',
    JSON.stringify({
      majors: [{ major: '6.9', base: 'v6.8.0.0', head: 'v6.9.0.0', expect: 'removed' }],
      breaks: [],
      confirmed: [],
    }),
  );
  const result = cliResult('check-breaks', ['--known', f.knownPath, '--repo', f.repo, '--cache', f.cache]);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /parse failures/u);
});
