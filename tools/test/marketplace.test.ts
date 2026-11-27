import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, test } from 'node:test';

// .claude-plugin/marketplace.json offers the skills as one Claude Code
// plugin. Its source `ref` (the release tag) decides which files users get
// and its `version` when they are offered an update, so both move with
// .skills-version on every release.
const root = join(import.meta.dirname, '../..');

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function plugins(): Record<string, unknown>[] {
  const parsed: unknown = JSON.parse(readFileSync(join(root, '.claude-plugin/marketplace.json'), 'utf8'));
  assert.ok(isRecord(parsed), 'marketplace.json is an object');
  const list = parsed.plugins;
  assert.ok(Array.isArray(list), 'marketplace.json has a plugins array');
  return list.filter((item) => isRecord(item));
}

describe('Claude Code marketplace', () => {
  test('the plugin version matches .skills-version', () => {
    const pinned = readFileSync(join(root, '.skills-version'), 'utf8').trim().replace(/^v/u, '');
    const [plugin] = plugins();
    assert.equal(plugin?.version, pinned);
  });

  test('the plugin is this repository at the release tag', () => {
    const pinned = readFileSync(join(root, '.skills-version'), 'utf8').trim();
    const [plugin] = plugins();
    assert.equal(plugin?.name, 'shopware-skills');
    assert.deepEqual(plugin.source, { source: 'github', repo: 'BrocksiNet/ai-skills-shopware', ref: pinned });
  });
});
