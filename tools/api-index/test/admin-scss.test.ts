// Historical 6.5-6.7 Admin SCSS variables and mixins tests (descoped WP C).
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { ADMIN_SCSS_MIXINS, ADMIN_SCSS_VARS, adminScssItems } from '../src/admin-scss.ts';
import { diffSnapshots, isBreak } from '../src/api-diff.ts';
import { Lookup } from '../src/facts.ts';
import { factsOfDir } from '../src/report.ts';
import { mergeSnapshots } from '../src/timeline.ts';

type Items = ReturnType<typeof adminScssItems>;

const VARS_V66 = '$color-gray-100: #f0f2f5;\n// @deprecated tag:v6.7.0 - removed\n$color-legacy: #111;\n';
const VARS_V67 = '$color-gray-100: #f0f2f5;\n$color-neutrals-slate-100: #f1f5f9;\n';
const MIXINS_V66 =
  '@mixin truncate() {\n  $local-only: 1px;\n  overflow: hidden;\n}\n@mixin old-helper($size) { width: $size; }\n';
const MIXINS_V67 = '@mixin truncate() {\n  overflow: hidden;\n}\n';

function snapshot(ref: string, items: Items): Parameters<typeof diffSnapshots>[0] {
  return { schema: 1, generator: 'test', ref, sha: `sha-${ref}`, builtAt: '2026-11-26T00:00:00Z', failed: [], items };
}

test('Admin SCSS variables and mixins: extraction and api-diff', () => {
  const items66 = [...adminScssItems(VARS_V66, ADMIN_SCSS_VARS), ...adminScssItems(MIXINS_V66, ADMIN_SCSS_MIXINS)];
  const items67 = [...adminScssItems(VARS_V67, ADMIN_SCSS_VARS), ...adminScssItems(MIXINS_V67, ADMIN_SCSS_MIXINS)];
  assert.equal(
    items66.some((item) => item.id === 'scss:var:$local-only'),
    false,
  );

  const diff = diffSnapshots(snapshot('v6.6.0.0', items66), snapshot('v6.7.0.0', items67), ['admin']);
  const byId = new Map(diff.changes.map((change) => [change.id, change]));
  assert.equal(byId.get('scss:var:$color-legacy')?.announced, true);
  const removedMixin = byId.get('scss:mixin:old-helper');
  assert.ok(removedMixin !== undefined);
  assert.equal(isBreak(removedMixin), true);
});

test('Admin SCSS variables and mixins: extension api-facts across 6.6-6.7 ignores local vars and comments', () => {
  const items66 = [...adminScssItems(VARS_V66, ADMIN_SCSS_VARS), ...adminScssItems(MIXINS_V66, ADMIN_SCSS_MIXINS)];
  const items67 = [...adminScssItems(VARS_V67, ADMIN_SCSS_VARS), ...adminScssItems(MIXINS_V67, ADMIN_SCSS_MIXINS)];

  const dir = mkdtempSync(join(tmpdir(), 'wpc-scss-facts-'));
  try {
    const file = join(dir, 'src/Resources/app/administration/src/module/my-mod/style.scss');
    mkdirSync(join(file, '..'), { recursive: true });
    writeFileSync(
      file,
      [
        '@import "~scss/variables";',
        '@import "~scss/mixins";',
        '$plugin-local: #fff;',
        '.my-box {',
        '  /* $color-legacy in comment is ignored */',
        '  color: $color-neutrals-slate-100;',
        '  background: $plugin-local;',
        '  @include old-helper(10px);',
        '}',
      ].join('\n'),
    );
    const lookup = new Lookup(mergeSnapshots([snapshot('v6.6.0.0', items66), snapshot('v6.7.0.0', items67)]));
    const report = factsOfDir(lookup, dir, '~6.6.0 || ~6.7.0');
    assert.deepEqual(
      report.facts.map((fact) => [fact.kind, fact.target, fact.releases]),
      [
        ['missing', 'scss:mixin:old-helper', [['6.7.0.0', '6.7.0.0']]],
        ['missing', 'scss:var:$color-neutrals-slate-100', [['6.6.0.0', '6.6.0.0']]],
      ],
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
