import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { grade } from '../graders/shopware-cli-routing.ts';

type Plan = Record<string, { runner: string; commands: string[][] }>;
function isPlan(value: unknown): value is Plan {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  return Object.values(value).every((v: unknown) => {
    if (typeof v !== 'object' || v === null || !('runner' in v) || !('commands' in v)) return false;
    return (
      typeof v.runner === 'string' &&
      Array.isArray(v.commands) &&
      v.commands.every((a: unknown) => Array.isArray(a) && a.every((x: unknown) => typeof x === 'string'))
    );
  });
}
function evaluate(change: (plan: Plan) => void): boolean {
  const path = resolve(
    import.meta.dirname,
    '../../evals/tasks/shopware-cli-routing/fixtures/pass/validation-plan.json',
  );
  const plan: unknown = JSON.parse(readFileSync(path, 'utf8'));
  if (!isPlan(plan)) throw new Error('invalid golden plan');
  change(plan);
  const workdir = mkdtempSync(join(tmpdir(), 'sw-cli-routing-'));
  try {
    writeFileSync(join(workdir, 'validation-plan.json'), JSON.stringify(plan));
    return grade({ workdir, transcript: '' }).pass;
  } finally {
    rmSync(workdir, { recursive: true, force: true });
  }
}
test('complete plans preserve each project runner and metadata coverage', () => {
  assert.equal(
    evaluate(() => {}),
    true,
  );
});
test('project quality alone does not establish extension metadata validity', () => {
  assert.equal(
    evaluate((p) => {
      const shop = p.shop;
      if (shop) shop.commands.pop();
    }),
    false,
  );
});
test('Shopware CLI cannot leak into an unrelated site plan', () => {
  assert.equal(
    evaluate((p) => {
      p.site = { runner: 'shopware-cli', commands: [['shopware-cli', 'project', 'validate', '--reporter', 'json']] };
    }),
    false,
  );
});
test('managed core stays on Podman even with a CLI config', () => {
  assert.equal(
    evaluate((p) => {
      p.core = { runner: 'shopware-cli', commands: [['shopware-cli', 'project', 'validate', '--reporter', 'json']] };
    }),
    false,
  );
});
test('unsupported reporter spelling from another release fails', () => {
  assert.equal(
    evaluate((p) => {
      const shop = p.shop;
      if (shop) shop.commands = shop.commands.map((a) => a.map((v) => (v === '--reporter' ? '--format' : v)));
    }),
    false,
  );
});
test('checks cannot be attached to the wrong workspace', () => {
  assert.equal(
    evaluate((p) => {
      const plugin = p.plugin,
        shop = p.shop;
      if (shop && plugin) {
        p.shop = plugin;
        p.plugin = shop;
      }
    }),
    false,
  );
});
test('equivalent non-TTY Podman and reporter argument forms pass', () => {
  assert.equal(
    evaluate((p) => {
      const core = p.core,
        plugin = p.plugin;
      if (core) core.commands = core.commands.map((a) => a.slice(0, 3).concat('-T', a.slice(3)));
      if (plugin) plugin.commands = [['shopware-cli', 'extension', 'validate', '--reporter=json', '.']];
    }),
    true,
  );
});
