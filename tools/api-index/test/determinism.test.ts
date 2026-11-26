// Determinism and negative-control acceptance tests for descoped WP C surfaces.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { ADMIN_SCSS_MIXINS, ADMIN_SCSS_VARS } from '../src/admin-scss.ts';
import { diffSnapshots, isBreak } from '../src/api-diff.ts';
import { buildSnapshot } from '../src/build.ts';
import { STOREFRONT_VIEWS } from '../src/storefront.ts';

const FIXED_NOW = (): Date => new Date('2026-11-26T00:00:00.000Z');

function git(dir: string, ...args: string[]): void {
  execFileSync('git', args, {
    cwd: dir,
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: 'Test',
      GIT_AUTHOR_EMAIL: 'test@example.com',
      GIT_COMMITTER_NAME: 'Test',
      GIT_COMMITTER_EMAIL: 'test@example.com',
    },
    stdio: 'ignore',
  });
}

function writeFiles(root: string, files: Record<string, string>): void {
  for (const [rel, content] of Object.entries(files)) {
    const full = join(root, rel);
    mkdirSync(join(full, '..'), { recursive: true });
    writeFileSync(full, content);
  }
}

test('buildSnapshot is byte-identical across repeated runs and a clean bug fix produces zero breaks', () => {
  const repo = mkdtempSync(join(tmpdir(), 'wpc-determ-'));
  try {
    git(repo, 'init', '-q', '-b', 'main');
    writeFiles(repo, {
      [`${STOREFRONT_VIEWS}/page/home.html.twig`]:
        "{% if feature('v6.8.0.0') %}{% block home_v2 %}<main>v2</main>{% endblock %}{% else %}{% block home_v1 %}<main>v1</main>{% endblock %}{% endif %}\n",
      [ADMIN_SCSS_VARS]: '$color-gray-100: #f0f2f5;\n',
      [ADMIN_SCSS_MIXINS]: '@mixin truncate() {\n  overflow: hidden;\n}\n',
      'src/Administration/Resources/app/administration/src/app/snippet/en-GB.json': JSON.stringify({
        global: { default: { save: 'Save', count: '1 item | {n} items' } },
      }),
    });
    git(repo, 'add', '.');
    git(repo, 'commit', '-q', '-m', 'base');

    const first = buildSnapshot({ repo, ref: 'HEAD', now: FIXED_NOW });
    const second = buildSnapshot({ repo, ref: 'HEAD', now: FIXED_NOW });
    assert.equal(JSON.stringify(first), JSON.stringify(second));
    assert.ok(first.items.some((item) => item.id === 'scss:var:$color-gray-100'));
    assert.ok(first.items.some((item) => item.id === 'scss:mixin:truncate'));
    assert.ok(first.items.some((item) => item.id === 'snippet:global.default.count'));
    assert.deepEqual(first.items.find((item) => item.id.endsWith('#home_v1'))?.flags, { until: 'v6.8.0' });

    writeFiles(repo, {
      [`${STOREFRONT_VIEWS}/page/home.html.twig`]:
        "{# bug fix comment #}\n{% if feature('v6.8.0.0') %}{% block home_v2 %}<main>v2</main>{% endblock %}{% else %}{% block home_v1 %}<main>v1</main>{% endblock %}{% endif %}\n",
      [ADMIN_SCSS_VARS]: '$color-gray-100: #f1f3f6;\n',
      'src/Administration/Resources/app/administration/src/app/snippet/en-GB.json': JSON.stringify({
        global: { default: { save: 'Save now', count: 'One item | {n} total items' } },
      }),
    });
    git(repo, 'add', '.');
    git(repo, 'commit', '-q', '-m', 'bugfix');

    const after = buildSnapshot({ repo, ref: 'HEAD', now: FIXED_NOW });
    const diff = diffSnapshots(first, after);
    assert.equal(diff.changes.filter((change) => isBreak(change)).length, 0);
    assert.deepEqual(diff.changes, []);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});
