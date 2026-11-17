import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { isNode } from '../src/node.ts';
import { readJson, writeJson } from '../src/store.ts';
import { cli, cliResult, commit, fixtureRepo, git, write } from './workflow-fixture.ts';

const temp = mkdtempSync(join(tmpdir(), 'changes-workflows-'));
after(() => {
  rmSync(temp, { recursive: true, force: true });
});

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

/** Last week's index under an older generator, trunk at one commit, and
 *  this week's with trunk one commit on, where route `gone` was removed. */
function setup(): { dir: string; repo: string; previous: string; current: string; cache: string; firstTrunk: string } {
  const dir = mkdtempSync(join(temp, 'case-'));
  const file = 'src/Core/Framework/DeliveryController.php';
  const repo = fixtureRepo(dir, [{ tag: 'v6.7.0.0', files: { [file]: controller(['kept', 'gone']) } }]);
  const firstTrunk = git(repo, 'rev-parse', 'HEAD');
  const cache = join(dir, 'cache');
  const previous = join(dir, 'previous.json.gz');
  cli('timeline', ['--repo', repo, '--from', '6.7.0.0', '--trunk', firstTrunk, '--cache', cache, '--out', previous]);
  const old = readJson(previous);
  assert.ok(isNode(old));
  writeJson(previous, { ...old, generator: 'api-index/0.0.0' });
  write(repo, file, controller(['kept']));
  commit(repo);
  const current = join(dir, 'current.json.gz');
  cli('timeline', ['--repo', repo, '--from', '6.7.0.0', '--trunk', 'HEAD', '--cache', cache, '--out', current]);
  return { dir, repo, previous, current, cache, firstTrunk };
}

test('api-changes CLI: rebuilds the previous trunk when the generator changed', () => {
  const f = setup();
  const result = cliResult('api-changes', [
    '--previous',
    f.previous,
    '--current',
    f.current,
    '--repo',
    f.repo,
    '--cache',
    join(f.dir, 'fresh-cache'),
  ]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(
    result.stderr,
    new RegExp(`rebuilt the previous trunk ${f.firstTrunk.slice(0, 8)} with api-index/`, 'u'),
  );
  assert.match(
    result.stdout,
    /The previous trunk was rebuilt with api-index\/[\d.]+, so the trunk changes below come from Shopware\./u,
  );
  assert.match(result.stdout, /\| trunk \| [^|]+ \| 1 \| 0 \| 0 \|/u);
  assert.match(result.stdout, /BREAK removed: route:api\.gone/u);
});

test('api-changes CLI: without --repo, or with the commit gone, it only warns', () => {
  const f = setup();
  const plain = cli('api-changes', ['--previous', f.previous, '--current', f.current]);
  assert.match(plain, /Some trunk changes below can come from the generator/u);

  const old = readJson(f.previous);
  assert.ok(isNode(old) && Array.isArray(old.releases));
  const releases = old.releases.map((release: unknown) =>
    isNode(release) && release.release === 'trunk' ? { ...release, sha: 'f'.repeat(40) } : release,
  );
  writeJson(f.previous, { ...old, releases });
  const result = cliResult('api-changes', [
    '--previous',
    f.previous,
    '--current',
    f.current,
    '--repo',
    f.repo,
    '--cache',
    f.cache,
  ]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stderr, /cannot rebuild the previous trunk ffffffff/u);
  assert.match(result.stdout, /Some trunk changes below can come from the generator/u);
});
