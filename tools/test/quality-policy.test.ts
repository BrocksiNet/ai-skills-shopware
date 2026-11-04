import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { test } from 'node:test';

const root = resolve(import.meta.dirname, '../..');
test('every mutation profile enforces 95 percent with the scoped node --test command runner', () => {
  for (const [profile, target] of Object.entries({
    manifest: 'tools/src/eval-manifest.ts',
    gate: 'tools/src/eval-gate.ts',
    findings: 'tools/src/findings.ts',
    constraints: 'tools/api-index/src/constraint.ts',
    routing: 'tools/src/routes.ts',
  })) {
    const script = `import config from './tools/stryker.config.mjs';
      console.log(JSON.stringify({thresholds: config.thresholds, runner: config.testRunner,
        coverage: config.coverageAnalysis, command: config.commandRunner.command, mutate: config.mutate,
        excluded: config.mutator?.excludedMutations ?? []}));`;
    const run = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
      cwd: root,
      env: { ...process.env, STRYKER_PROFILE: profile },
      encoding: 'utf8',
      timeout: 10000,
    });
    assert.equal(run.status, 0, run.stderr);
    const value: unknown = JSON.parse(run.stdout);
    assert.ok(
      typeof value === 'object' &&
        value !== null &&
        'thresholds' in value &&
        'command' in value &&
        'runner' in value &&
        'coverage' in value &&
        'mutate' in value &&
        'excluded' in value,
    );
    assert.deepEqual(value.thresholds, { high: 95, low: 95, break: 95 });
    assert.equal(value.runner, 'command');
    assert.equal(value.coverage, 'off');
    assert.ok(typeof value.command === 'string');
    assert.match(value.command, /^node --test --test-concurrency=1 /u);
    assert.deepEqual(value.excluded, []);
    assert.ok(Array.isArray(value.mutate));
    assert.deepEqual(value.mutate, [target]);
  }
});
