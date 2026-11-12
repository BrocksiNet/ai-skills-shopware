// The local-environment graders (sw-local-dev) read scripts/check.sh. These
// are rewrites Haiku wrote in the A/B of 2026-11-11 that the first graders
// failed although they were right.
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, test } from 'node:test';
import { grade as ddev } from '../graders/ddev-project-runs-in-ddev.ts';
import { grade as vagrant } from '../graders/vagrant-project-uses-synced-folder.ts';

function workdir(script: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'check-script-'));
  mkdirSync(join(dir, 'scripts'));
  writeFileSync(join(dir, 'scripts/check.sh'), `#!/usr/bin/env bash\nset -euo pipefail\n${script}`);
  return dir;
}

describe('check-script graders', () => {
  test('a variable for the guest folder counts as the cd', () => {
    const dir = workdir(
      'GUEST_DIR=/var/www/shopware\nvagrant rsync app\n' +
        'vagrant ssh app -c "cd ${GUEST_DIR} && vendor/bin/phpunit --filter CartProcessorTest"\n' +
        `vagrant ssh app -c "cd '$GUEST_DIR' && composer phpstan"\n`,
    );
    assert.equal(vagrant({ workdir: dir, transcript: '' }).pass, true);
  });

  test('a quoted command prefix with spaces in a variable is expanded', () => {
    const dir = workdir(
      'RUN="ddev exec --dir /var/www/html"\n' +
        '$RUN vendor/bin/phpunit --filter CartProcessorTest\n$RUN composer phpstan\n',
    );
    assert.equal(ddev({ workdir: dir, transcript: '' }).pass, true);
  });

  test('a helper function that passes "$@" on is inlined', () => {
    const dir = workdir(
      'in_ddev() {\n  ddev exec "$@"\n}\n' +
        'in_ddev vendor/bin/phpunit --filter CartProcessorTest\nin_ddev composer phpstan\n',
    );
    assert.equal(ddev({ workdir: dir, transcript: '' }).pass, true);
  });

  test('a helper with a host fallback is still a host run', () => {
    const dir = workdir(
      'run() {\n  if ! command -v ddev >/dev/null; then\n    "$@"\n  else\n    ddev exec "$@"\n  fi\n}\n' +
        'run vendor/bin/phpunit --filter CartProcessorTest\nrun composer phpstan\n',
    );
    const result = ddev({ workdir: dir, transcript: '' });
    assert.equal(result.pass, false);
    assert.match(result.detail, /host_run=1/u);
  });

  test('a direct run guarded by IS_DDEV_PROJECT runs inside the container', () => {
    const dir = workdir(
      'run() {\n  if [ "${IS_DDEV_PROJECT:-}" = "true" ]; then\n    "$@"\n  else\n    ddev exec "$@"\n  fi\n}\n' +
        'run vendor/bin/phpunit --filter CartProcessorTest\nrun composer phpstan\n',
    );
    assert.equal(ddev({ workdir: dir, transcript: '' }).pass, true);
  });

  test('a negated IS_DDEV_PROJECT guard keeps the else branch inside', () => {
    const dir = workdir(
      'if [ -z "${IS_DDEV_PROJECT:-}" ]; then\n  ddev exec vendor/bin/phpunit --filter CartProcessorTest\n  ddev composer phpstan\n' +
        'else\n  vendor/bin/phpunit --filter CartProcessorTest\n  composer phpstan\nfi\n',
    );
    assert.equal(ddev({ workdir: dir, transcript: '' }).pass, true);
  });

  test('a host run on the outside branch of the guard still fails', () => {
    const dir = workdir(
      'if [ "${IS_DDEV_PROJECT:-}" != "true" ]; then\n  vendor/bin/phpunit --filter CartProcessorTest\nelse\n' +
        '  ddev exec vendor/bin/phpunit --filter CartProcessorTest\nfi\nddev composer phpstan\n',
    );
    const result = ddev({ workdir: dir, transcript: '' });
    assert.equal(result.pass, false);
    assert.match(result.detail, /host_run=1/u);
  });
});
