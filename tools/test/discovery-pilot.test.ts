import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { after, describe, test } from 'node:test';
import { prepareDiscovery, runDiscovery } from '../src/discovery-pilot.ts';
import { profileSkills } from '../src/skills-profile.ts';
import { checkRoutes } from '../src/check-reports.ts';

const ROOT = resolve(import.meta.dirname, '../..');
const tmp = mkdtempSync(join(tmpdir(), 'discovery-pilot-'));
after(() => {
  rmSync(tmp, { recursive: true, force: true });
});

const call = (module: unknown, method: string, input: unknown): unknown => {
  const fn: unknown = typeof module === 'object' && module !== null ? Reflect.get(module, method) : undefined;
  if (typeof fn !== 'function') throw new Error(`missing ${method}`);
  const result: unknown = Reflect.apply(fn, undefined, [input]);
  return result;
};

describe('discovery consolidation pilot', () => {
  test('packages a self-contained merged entry point and an actual removal arm', () => {
    const destination = join(tmp, 'packages');
    prepareDiscovery(ROOT, destination);
    const inventory = (variant: string): string[] => profileSkills(ROOT, '', join(destination, variant, 'skills'));
    assert.equal(inventory('merged').length, inventory('current').length - 1);
    assert.equal(inventory('removed').length, inventory('current').length - 2);
    assert.ok(!inventory('merged').includes('sw-help'));
    const router = join(destination, 'merged/skills/sw-skill-router');
    assert.ok(existsSync(join(router, 'references/library-guide.md')));
    assert.ok(existsSync(join(router, 'scripts/route.mjs')));
    assert.match(readFileSync(join(router, 'SKILL.md'), 'utf8'), /library-guide.md/u);
    assert.equal(
      checkRoutes(join(destination, 'merged'), () => {}),
      0,
    );
    assert.throws(() => {
      prepareDiscovery(ROOT, destination);
    }, /already exists/u);
  });
  test('the merged router preserves every recorded routing selection', async () => {
    const destination = join(tmp, 'replay');
    prepareDiscovery(ROOT, destination);
    const original: unknown = await import(
      pathToFileURL(join(destination, 'current/skills/sw-skill-router/scripts/route.mjs')).href
    );
    const merged: unknown = await import(
      pathToFileURL(join(destination, 'merged/skills/sw-skill-router/scripts/route.mjs')).href
    );
    for (const name of readdirSync(join(ROOT, 'evals/routing'))) {
      const diff = readFileSync(join(ROOT, 'evals/routing', name, 'diff.patch'), 'utf8');
      const input = { files: call(original, 'parseDiff', diff), kind: 'any', task: 'any' };
      assert.deepEqual(call(merged, 'route', input), call(original, 'route', input), name);
    }
  });

  test('runs every arm in a separate profile and persists errors rather than hiding them', async () => {
    const seen: string[] = [];
    const destination = join(tmp, 'run');
    const rc = await runDiscovery({
      root: ROOT,
      destination,
      repeats: 1,
      env: {},
      log: () => {},
      random: () => 0,
      run: async (o) => {
        seen.push(`${o.task}:${o.env.EVAL_SKILLS_ROOT ?? ''}`);
        await Promise.resolve();
        return seen.length === 1 ? 4 : 0;
      },
    });
    assert.equal(rc, 2);
    assert.equal(seen.length, 1);
    assert.equal(readFileSync(join(destination, 'trials.jsonl'), 'utf8').trim().split('\n').length, 9);
    assert.ok(existsSync(join(destination, 'manifest.json')));
  });
  test('a healthy provider runs all task/variant combinations', async () => {
    const seen: string[] = [];
    const rc = await runDiscovery({
      root: ROOT,
      destination: join(tmp, 'healthy'),
      repeats: 1,
      env: {},
      log: () => {},
      run: async (o) => {
        seen.push(`${o.task}:${o.env.EVAL_SKILLS_ROOT ?? ''}`);
        await Promise.resolve();
        return 0;
      },
    });
    assert.equal(rc, 0);
    assert.equal(seen.length, 9);
    assert.equal(new Set(seen).size, 9);
  });
});
