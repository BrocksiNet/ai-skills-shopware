import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { test } from 'node:test';

const root = resolve(import.meta.dirname, '../..');
test('decision modules do not load file I/O, revision lookup, or CLI adapters transitively', () => {
  const script = `
    import {registerHooks} from 'node:module';
    import {pathToFileURL} from 'node:url';
    registerHooks({resolve(specifier, context, next) {
      if (['node:fs', 'node:child_process', 'node:crypto'].includes(specifier))
        throw new Error('I/O imported into decision layer: ' + specifier + ' from ' + context.parentURL);
      return next(specifier, context);
    }});
    for (const file of ['eval-manifest', 'eval-results', 'eval-gate', 'findings', 'ab', 'eval-profiles'])
      await import(pathToFileURL(process.cwd() + '/tools/src/' + file + '.ts').href);
    await import(pathToFileURL(process.cwd() + '/tools/api-index/src/constraint.ts').href);
    console.log('decision imports isolated');
  `;
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
    cwd: root,
    env: process.env,
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /decision imports isolated/u);
});
