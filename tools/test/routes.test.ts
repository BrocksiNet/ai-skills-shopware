import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, test } from 'node:test';
import {
  END,
  START,
  applyTable,
  parseDiff,
  renderTable,
  routeErrors,
  selectReferences,
  type RouteFile,
} from '../src/routes.ts';

const DIFF = `diff --git a/src/Migration/Migration1700000000Foo.php b/src/Migration/Migration1700000000Foo.php
new file mode 100644
--- /dev/null
+++ b/src/Migration/Migration1700000000Foo.php
@@ -0,0 +1,2 @@
+class Migration1700000000Foo extends MigrationStep
+{
diff --git a/src/Old.php b/src/Old.php
deleted file mode 100644
--- a/src/Old.php
+++ /dev/null
@@ -1 +0,0 @@
-$criteria = new Criteria();
diff --git a/src/Service.php b/src/Service.php
--- a/src/Service.php
+++ b/src/Service.php
@@ -1,3 +1,3 @@
 context line with curl_init(
-old
+new
`;

const ROUTES: RouteFile = {
  routes: [
    { reference: 'references/migrations.md', when: 'Migrations.', paths_any: ['**/Migration/Migration*.php'] },
    { reference: 'references/dal.md', when: 'DAL | data.', anchors_any: ['new Criteria\\('] },
    { reference: 'references/symfony.md', when: 'Symfony.', anchors_any: ['curl_init\\('] },
    { reference: 'references/style.md', when: 'Always.', always: true },
  ],
};

describe('parseDiff', () => {
  test('collects paths, including deleted files, and only changed lines', () => {
    const files = parseDiff(DIFF);
    assert.deepEqual(
      files.map((f) => f.path),
      ['src/Migration/Migration1700000000Foo.php', 'src/Old.php', 'src/Service.php'],
    );
    assert.deepEqual(files[1]?.lines, ['$criteria = new Criteria();']);
    assert.deepEqual(files[2]?.lines, ['old', 'new']);
  });
});

describe('selectReferences', () => {
  test('matches globs, anchors on removed lines and always; ignores context lines', () => {
    assert.deepEqual(selectReferences(ROUTES, parseDiff(DIFF)), [
      'references/migrations.md',
      'references/dal.md',
      'references/style.md',
    ]);
  });
  test('lists a reference once when several routes select it', () => {
    const twice: RouteFile = { routes: [ROUTES.routes[0]!, { ...ROUTES.routes[0]!, paths_any: ['**/*.php'] }] };
    assert.deepEqual(selectReferences(twice, parseDiff(DIFF)), ['references/migrations.md']);
  });
});

describe('renderTable', () => {
  test('shows globs without **/, unescaped anchors, escaped pipes', () => {
    const table = renderTable(ROUTES);
    assert.ok(table.startsWith(START) && table.endsWith(END));
    assert.match(table, /\| \[`migrations\.md`\]\(references\/migrations\.md\) \| Migrations\. \| `Migration\/Migration\*\.php` \|/);
    assert.match(table, /DAL \\\| data\. \| `new Criteria\(` \|/);
    assert.match(table, /\| Always\. \| any change \|/);
  });
  test('applyTable replaces the block and is idempotent; needs markers', () => {
    const once = applyTable(`intro\n<!-- routes:start -->\nold\n${END}\noutro`, ROUTES);
    assert.ok(once.startsWith('intro\n' + START) && once.endsWith(END + '\noutro'));
    assert.equal(applyTable(once, ROUTES), once);
    assert.throws(() => applyTable('no markers', ROUTES), /markers/);
  });
});

describe('routeErrors', () => {
  function skill(routes: unknown, skillMd?: string, refs = ['a.md']): string {
    const dir = mkdtempSync(join(tmpdir(), 'routes-'));
    mkdirSync(join(dir, 'references'));
    for (const r of refs) writeFileSync(join(dir, 'references', r), '# ref\n');
    writeFileSync(join(dir, 'routes.json'), JSON.stringify(routes));
    const table = skillMd ?? `x\n${renderTable(routes as RouteFile)}\n`;
    writeFileSync(join(dir, 'SKILL.md'), table);
    return dir;
  }
  const ok: RouteFile = { routes: [{ reference: 'references/a.md', when: 'A.', paths_any: ['**/*.php'] }] };

  test('a rendered, complete skill has no errors', () => {
    assert.deepEqual(routeErrors(skill(ok), 's'), []);
  });
  test('reports a missing reference, bad regex and a route with no trigger', () => {
    const errors = routeErrors(
      skill({ routes: [{ reference: 'references/nope.md', when: 'N.', anchors_any: ['('] }, { reference: 'references/a.md', when: 'A.' }] }),
      's',
    );
    assert.equal(errors.length, 3);
    assert.match(errors.join('\n'), /nope\.md not found/);
    assert.match(errors.join('\n'), /bad regex \(/);
    assert.match(errors.join('\n'), /needs paths_any, anchors_any or always/);
  });
  test('reports an unrouted reference but not enforced-by-ci.md', () => {
    const errors = routeErrors(skill(ok, undefined, ['a.md', 'b.md', 'enforced-by-ci.md']), 's');
    assert.deepEqual(errors, ['s/routes.json: references/b.md has no route']);
  });
  test('reports a stale table and missing markers', () => {
    assert.match(routeErrors(skill(ok, `<!-- routes:start -->\n${END}\n`), 's').join(), /out of date/);
    assert.match(routeErrors(skill(ok, 'none\n'), 's').join(), /markers/);
  });
  test('reports invalid JSON', () => {
    const dir = skill(ok);
    writeFileSync(join(dir, 'routes.json'), '{');
    assert.match(routeErrors(dir, 's').join(), /s\/routes\.json:/);
  });
});
