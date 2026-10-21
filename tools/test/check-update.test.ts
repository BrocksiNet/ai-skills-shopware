import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, describe, test } from 'node:test';
import { checkUpdate, pinnedVersion } from '../src/check-update.ts';

const tmp = mkdtempSync(join(tmpdir(), 'check-update-test-'));
after(() => {
  rmSync(tmp, { recursive: true, force: true });
});
const root = join(tmp, 'root');
const cwd = join(tmp, 'cwd');
mkdirSync(root);
mkdirSync(cwd);

const v090 = (): Promise<string> => Promise.resolve('v0.9.0');

async function check(env: NodeJS.ProcessEnv, latest: () => Promise<string>): Promise<{ rc: number; out: string }> {
  let out = '';
  const rc = await checkUpdate({
    root,
    cwd,
    env,
    out: (t) => {
      out += t;
    },
    latest,
  });
  return { rc, out };
}

describe('check-update', () => {
  test('the pin: environment, then current dir, then repo root', () => {
    assert.equal(pinnedVersion({ root, cwd, env: {} }), '');
    writeFileSync(join(root, '.skills-version'), ' v0.7.0 \n');
    assert.equal(pinnedVersion({ root, cwd, env: {} }), 'v0.7.0');
    writeFileSync(join(cwd, '.skills-version'), 'v0.8.0\n');
    assert.equal(pinnedVersion({ root, cwd, env: {} }), 'v0.8.0');
    assert.equal(pinnedVersion({ root, cwd, env: { SKILLS_PINNED_VERSION: 'v1.0.0' } }), 'v1.0.0');
    rmSync(join(cwd, '.skills-version'));
    rmSync(join(root, '.skills-version'));
  });
  test('unpinned, up to date and behind', async () => {
    const unpinned = await check({}, v090);
    assert.equal(unpinned.rc, 0);
    assert.match(unpinned.out, /^Pinned {5}: <unpinned>$/mu);
    assert.match(unpinned.out, /install with @v0\.9\.0 and record it/u);
    assert.match((await check({ SKILLS_PINNED_VERSION: 'v0.9.0' }, v090)).out, /You are up to date \(v0\.9\.0\)\.\n$/u);
    assert.match(
      (await check({ SKILLS_PINNED_VERSION: 'v0.8.0' }, v090)).out,
      /update is available: v0\.8\.0 -> v0\.9\.0/u,
    );
  });
  test('an unknown latest tag is exit 1 with the reason', async () => {
    const offline = await check({}, () => Promise.reject(new Error('fetch failed')));
    assert.equal(offline.rc, 1);
    assert.match(
      offline.out,
      /^Could not determine the latest release tag for BrocksiNet\/ai-skills-shopware \(fetch failed\)\.$/mu,
    );
    assert.equal((await check({}, () => Promise.resolve(''))).rc, 1);
  });
});
