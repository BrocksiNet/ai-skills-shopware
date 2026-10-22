import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { locateIndex } from '../src/locate.ts';

function cacheWithIndex(ageDays: number): { env: NodeJS.ProcessEnv; path: string } {
  const home = mkdtempSync(join(tmpdir(), 'locate.'));
  const dir = join(home, 'ai-skills-shopware', 'api-index');
  mkdirSync(dir, { recursive: true });
  const path = join(dir, 'api-index.json.gz');
  writeFileSync(path, '');
  const when = new Date(Date.now() - ageDays * 24 * 3600 * 1000);
  utimesSync(path, when, when);
  return { env: { XDG_CACHE_HOME: home }, path };
}

test('--index wins, then $API_INDEX', async () => {
  assert.deepEqual(await locateIndex('/x/given.json.gz', { API_INDEX: '/x/env.json.gz' }, true), {
    path: '/x/given.json.gz',
  });
  assert.deepEqual(await locateIndex(undefined, { API_INDEX: '/x/env.json.gz' }, true), { path: '/x/env.json.gz' });
});

test('a fresh cached download is used without fetching', async () => {
  const { env, path } = cacheWithIndex(1);
  assert.deepEqual(await locateIndex(undefined, env, true), { path });
});

test('without the download, a stale cache is still used and a missing one is an error', async () => {
  const { env, path } = cacheWithIndex(30);
  assert.deepEqual(await locateIndex(undefined, env, false), { path });
  const empty = mkdtempSync(join(tmpdir(), 'locate.'));
  await assert.rejects(locateIndex(undefined, { XDG_CACHE_HOME: empty }, false), /no index at/u);
});
