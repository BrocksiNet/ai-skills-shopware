// The local-environment graders (sw-local-dev) read scripts/check.sh. These
// are rewrites Haiku wrote in the A/B of 2026-11-11 that the first graders
// failed although they were right.
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, test } from 'node:test';
import { grade as ddev } from '../graders/ddev-project-runs-in-ddev.ts';
import { grade as docker } from '../graders/docker-project-uses-compose-service.ts';
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
      'GUEST_DIR=/var/www/shopware\n' +
        'vagrant ssh -c "cd ${GUEST_DIR} && vendor/bin/phpunit --filter CartProcessorTest"\n' +
        `vagrant ssh -c "cd '$GUEST_DIR' && composer phpstan"\n`,
    );
    assert.equal(vagrant({ workdir: dir, transcript: '' }).pass, true);
  });

  test('compose exec with a working directory option names the service', () => {
    const dir = workdir(
      'docker compose exec -T -w /var/www/html web vendor/bin/phpunit --filter CartProcessorTest\n' +
        'docker compose exec -T -w /var/www/html web composer phpstan\n',
    );
    assert.equal(docker({ workdir: dir, transcript: '' }).pass, true);
  });

  test('a helper function that passes "$@" on is inlined', () => {
    const dir = workdir(
      'exec_web() {\n  docker compose exec -T web "$@"\n}\n' +
        'exec_web vendor/bin/phpunit --filter CartProcessorTest\nexec_web composer phpstan\n',
    );
    assert.equal(docker({ workdir: dir, transcript: '' }).pass, true);
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
});
