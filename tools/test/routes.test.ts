import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, test } from 'node:test';
import {
  END,
  START,
  applyTable,
  fixedReferences,
  loadRoutes,
  parseDiff,
  renderTable,
  routeMatches,
  routeDiff,
  routeErrors,
  selectReferences,
  withDefaultExcludes,
  type ChangedFile,
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
    { reference: 'references/stuck.md', when: 'Keeps failing.', on_demand: true },
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
  test('matches globs and anchors on removed lines; ignores context lines, always and on_demand', () => {
    assert.deepEqual(selectReferences(ROUTES, parseDiff(DIFF)), ['references/migrations.md', 'references/dal.md']);
  });
  test('fixedReferences lists always and on_demand routes apart from the diff', () => {
    assert.deepEqual(fixedReferences(ROUTES, 'always'), ['references/style.md']);
    assert.deepEqual(fixedReferences(ROUTES, 'on_demand'), ['references/stuck.md']);
  });
  test('lists a reference once when several routes select it', () => {
    const [first] = ROUTES.routes;
    assert.ok(first);
    const twice: RouteFile = { routes: [first, { ...first, paths_any: ['**/*.php'] }] };
    assert.deepEqual(selectReferences(twice, parseDiff(DIFF)), ['references/migrations.md']);
  });
});

describe('renderTable', () => {
  test('shows globs without **/, unescaped anchors, escaped pipes', () => {
    const table = renderTable(ROUTES);
    assert.ok(table.startsWith(START) && table.endsWith(END));
    assert.match(
      table,
      /\| \[`migrations\.md`\]\(references\/migrations\.md\) \| Migrations\. \| `Migration\/Migration\*\.php` \|/u,
    );
    assert.match(table, /DAL \\\| data\. \| `new Criteria\(` \|/u);
    assert.match(table, /\| Always\. \| any change \|/u);
    assert.match(table, /\| Keeps failing\. \| on demand \|/u);
  });
  test('shows at most two globs and one anchor, then an ellipsis', () => {
    const many: RouteFile = {
      routes: [
        { reference: 'references/a.md', when: 'A.', paths_any: ['**/a', '**/b', '**/c'], anchors_any: ['x', 'y'] },
      ],
    };
    assert.match(renderTable(many), /\| A\. \| `a`, `b`, `x`, … \|/u);
    const few: RouteFile = {
      routes: [{ reference: 'references/a.md', when: 'A.', paths_any: ['**/a'], anchors_any: ['x'] }],
    };
    assert.match(renderTable(few), /\| A\. \| `a`, `x` \|/u);
  });
  test('applyTable replaces the block and is idempotent; needs markers', () => {
    const once = applyTable(`intro\n<!-- routes:start -->\nold\n${END}\noutro`, ROUTES);
    assert.ok(once.startsWith('intro\n' + START) && once.endsWith(END + '\noutro'));
    assert.equal(applyTable(once, ROUTES), once);
    assert.throws(() => applyTable('no markers', ROUTES), /markers/u);
  });
});

/** A skill folder with `routes` and its rendered table, or `skillMd`. */
function skill(routes: RouteFile, skillMd?: string, refs = ['a.md']): string {
  const dir = mkdtempSync(join(tmpdir(), 'routes-'));
  mkdirSync(join(dir, 'references'));
  for (const r of refs) writeFileSync(join(dir, 'references', r), '# ref\n');
  writeFileSync(join(dir, 'routes.json'), JSON.stringify(routes));
  writeFileSync(join(dir, 'SKILL.md'), skillMd ?? `x\n${renderTable(routes)}\n`);
  return dir;
}

describe('routeErrors', () => {
  const ok: RouteFile = { routes: [{ reference: 'references/a.md', when: 'A.', paths_any: ['**/*.php'] }] };

  test('a rendered, complete skill has no errors', () => {
    assert.deepEqual(routeErrors(skill(ok), 's'), []);
  });
  test('reports a missing reference, bad regex and a route with no trigger', () => {
    const errors = routeErrors(
      skill({
        routes: [
          { reference: 'references/nope.md', when: 'N.', anchors_any: ['('] },
          { reference: 'references/a.md', when: 'A.' },
        ],
      }),
      's',
    );
    assert.equal(errors.length, 3);
    assert.match(errors.join('\n'), /nope\.md not found/u);
    assert.match(errors.join('\n'), /bad regex \(/u);
    assert.match(errors.join('\n'), /needs paths_any, anchors_any, always or on_demand/u);
  });
  test('accepts on_demand alone; rejects it next to triggers or always', () => {
    assert.deepEqual(
      routeErrors(skill({ routes: [{ reference: 'references/a.md', when: 'A.', on_demand: true }] }), 's'),
      [],
    );
    for (const extra of [{ paths_any: ['**/*.php'] }, { always: true }]) {
      const errors = routeErrors(
        skill({ routes: [{ reference: 'references/a.md', when: 'A.', on_demand: true, ...extra }] }),
        's',
      );
      assert.match(errors.join(), /not more than one/u);
    }
  });
  test('reports an unrouted reference but not enforced-by-ci.md', () => {
    const errors = routeErrors(skill(ok, undefined, ['a.md', 'b.md', 'enforced-by-ci.md']), 's');
    assert.deepEqual(errors, ['s/routes.json: references/b.md has no route']);
  });
  test('reports a stale table and missing markers', () => {
    assert.match(routeErrors(skill(ok, `<!-- routes:start -->\n${END}\n`), 's').join(), /out of date/u);
    assert.match(routeErrors(skill(ok, 'none\n'), 's').join(), /markers/u);
  });
  test('reports invalid JSON', () => {
    const dir = skill(ok);
    writeFileSync(join(dir, 'routes.json'), '{');
    assert.match(routeErrors(dir, 's').join(), /s\/routes\.json:/u);
  });
});

const RENAME = `diff --git a/tests/integration/FooTest.php b/tests/devops/FooTest.php
similarity index 100%
rename from tests/integration/FooTest.php
rename to tests/devops/FooTest.php
diff --git a/tests/integration/BarTest.php b/tests/devops/BarTest.php
similarity index 90%
rename from tests/integration/BarTest.php
rename to tests/devops/BarTest.php
--- a/tests/integration/BarTest.php
+++ b/tests/devops/BarTest.php
@@ -1,2 +1,2 @@
-namespace Old;
+namespace New;
diff --git a/src/schema.sql b/src/schema.sql
--- a/src/schema.sql
+++ b/src/schema.sql
@@ -1,2 +1,1 @@
--- a comment
+++ counter
`;

describe('parseDiff with renames', () => {
  test('a renamed file is listed under both paths, the old one without lines', () => {
    assert.deepEqual(parseDiff(RENAME), [
      { path: 'tests/integration/FooTest.php', lines: [] },
      { path: 'tests/devops/FooTest.php', lines: [] },
      { path: 'tests/integration/BarTest.php', lines: [] },
      { path: 'tests/devops/BarTest.php', lines: ['namespace Old;', 'namespace New;'] },
      { path: 'src/schema.sql', lines: ['-- a comment', '++ counter'] },
    ]);
  });
});

const changed = (path: string): ChangedFile[] => [{ path, lines: ['use Connection;'] }];

describe('exclude_paths', () => {
  const routes: RouteFile = {
    exclude_paths: ['**/tests/**', '**/*.md'],
    routes: [
      { reference: 'references/a.md', when: 'A.', anchors_any: ['Connection'] },
      { reference: 'references/b.md', when: 'B.', paths_any: ['**/*.md'], exclude_paths: [] },
    ],
  };

  test('the file default keeps a route quiet on tests and docs', () => {
    const loaded = withDefaultExcludes(routes);
    assert.deepEqual(selectReferences(loaded, changed('tests/unit/FooTest.php')), []);
    assert.deepEqual(selectReferences(loaded, changed('src/Foo.php')), ['references/a.md']);
  });

  test('a route list of its own replaces the default, and [] opts out', () => {
    assert.deepEqual(selectReferences(withDefaultExcludes(routes), changed('UPGRADE-6.8.md')), ['references/b.md']);
  });

  test('a bad exclude_paths is a shape error', () => {
    const dir = mkdtempSync(join(tmpdir(), 'routes-exclude-'));
    mkdirSync(join(dir, 'references'));
    writeFileSync(join(dir, 'references', 'a.md'), '# a\n');
    const route = { reference: 'references/a.md', when: 'A.', anchors_any: ['x'], exclude_paths: 'tests' };
    writeFileSync(join(dir, 'routes.json'), JSON.stringify({ exclude_paths: [1], routes: [route] }));
    const errors = routeErrors(dir, 's').join('\n');
    assert.match(errors, /s\/routes\.json: exclude_paths must be a list of globs/u);
    assert.match(errors, /routes\[0\]\.exclude_paths must be a list of globs/u);
  });
});

describe('routing input and rendering contracts', () => {
  test('malformed top-level inputs and route entries return diagnostics rather than crashing', () => {
    const dir = skill({ routes: [{ reference: 'references/a.md', when: 'A', always: true }] });
    for (const value of [null, [], 1, {}, { routes: [] }]) {
      writeFileSync(join(dir, 'routes.json'), JSON.stringify(value));
      assert.match(routeErrors(dir, 's').join(), /routes must be a non-empty list/u);
      assert.throws(() => loadRoutes(dir), /routes must be a non-empty list/u);
    }
    for (const entry of [null, [], 1, 'route']) {
      writeFileSync(join(dir, 'routes.json'), JSON.stringify({ routes: [entry] }));
      assert.match(routeErrors(dir, 's').join(), /routes\[0\] must be an object/u);
    }
  });
  test('mixed valid and invalid trigger entries are rejected, as are invalid metadata fields', () => {
    const route = { reference: 'references/a.md', when: 'A', paths_any: ['**/*.php'] };
    const dir = skill({ routes: [route] });
    const cases = [
      { fields: { reference: '' }, error: /reference must be a string/u },
      { fields: { when: '' }, error: /when must be a non-empty string/u },
      { fields: { paths_any: ['**/*.php', 4] }, error: /paths_any must be a list/u },
      { fields: { anchors_any: ['valid', null] }, error: /anchors_any must be a list/u },
      { fields: { always: 'yes' }, error: /always must be true or false/u },
      { fields: { on_demand: 1 }, error: /on_demand must be true or false/u },
      { fields: { exclude_paths: ['**/test/**', ''] }, error: /exclude_paths must be a list/u },
    ];
    for (const { fields, error } of cases) {
      writeFileSync(join(dir, 'routes.json'), JSON.stringify({ routes: [{ ...route, ...fields }] }));
      assert.match(routeErrors(dir, 's').join(), error);
      assert.throws(() => loadRoutes(dir), error);
    }
  });
  test('the published marker contract is literal, and partial or reversed marker pairs fail', () => {
    const table = renderTable(ROUTES);
    assert.match(table, /^<!-- routes:start: generated/u);
    assert.match(table, /<!-- routes:end -->$/u);
    for (const text of ['<!-- routes:end -->', '<!-- routes:start -->', '<!-- routes:end -->\n<!-- routes:start -->'])
      assert.throws(() => applyTable(text, ROUTES), /missing or unbalanced/u);
  });
  test('a skill with no route file is valid, and non-Markdown reference files are ignored', () => {
    const empty = mkdtempSync(join(tmpdir(), 'routes-empty-'));
    assert.equal(loadRoutes(empty), null);
    assert.deepEqual(routeErrors(empty, 'empty'), []);
    const dir = skill({ routes: [{ reference: 'references/a.md', when: 'A', always: true }] }, undefined, [
      'a.md',
      'notes.txt',
    ]);
    assert.deepEqual(routeErrors(dir, 's'), []);
  });
});

const table = (paths: string[], anchors: string[]): string =>
  renderTable({ routes: [{ reference: 'references/a.md', when: 'A', paths_any: paths, anchors_any: anchors }] });

describe('routing decision and documentation workflows', () => {
  test('fixed references never become diff triggers even when a caller also supplies matching signals', () => {
    const route = { reference: 'references/a.md', when: 'A', paths_any: ['**/*.php'], anchors_any: ['needle'] };
    const files = [{ path: 'src/Service.php', lines: ['needle'] }];
    assert.equal(routeMatches({ ...route, always: true }, files), false);
    assert.equal(routeMatches({ ...route, on_demand: true }, files), false);
    assert.equal(routeMatches({ ...route, always: false, on_demand: false }, files), true);
  });
  test('anchor-only selection supports Unicode and safely ignores malformed regular expressions', () => {
    const route = { reference: 'references/a.md', when: 'A' };
    assert.equal(routeMatches({ ...route, anchors_any: ['\\p{L}'] }, [{ path: 'src/a.php', lines: ['é'] }]), true);
    assert.equal(routeMatches({ ...route, anchors_any: ['('] }, changed('src/a.php')), false);
    assert.equal(routeMatches(route, changed('src/a.php')), false);
  });
  test('the route report separates selected, always and on-demand references', () => {
    const root = mkdtempSync(join(tmpdir(), 'route-report-'));
    const dir = join(root, 'skills/sw-example');
    mkdirSync(dir, { recursive: true });
    mkdirSync(join(root, 'skills/sw-empty'));
    const routes: RouteFile = {
      routes: [
        { reference: 'references/change.md', when: 'Changed PHP', paths_any: ['**/*.php'] },
        { reference: 'references/base.md', when: 'Every task', always: true },
        { reference: 'references/stuck.md', when: 'When stuck', on_demand: true },
      ],
    };
    writeFileSync(join(dir, 'routes.json'), JSON.stringify(routes));
    assert.deepEqual(routeDiff(root, DIFF), {
      selected: { 'sw-example': ['references/change.md'] },
      always: { 'sw-example': ['references/base.md'] },
      on_demand: { 'sw-example': ['references/stuck.md'] },
    });
  });
  test('table headers and truncation distinguish complete hints from omitted signals', () => {
    assert.deepEqual(table(['a'], []).split('\n').slice(0, 3), [
      START,
      '| Read | When | Or the change touches |',
      '| ---- | ---- | --------------------- |',
    ]);
    assert.match(table(['a', 'b'], ['x']), /\| A \| `a`, `b`, `x` \|/u);
    assert.match(table(['a', 'b', 'c'], []), /\| A \| `a`, `b`, … \|/u);
    assert.match(table(['a'], ['x', 'y']), /\| A \| `a`, `x`, … \|/u);
    assert.match(table(['**/**/a', 'src/**/b'], []), /\| A \| `a`, `src\/\*\*\/b` \|/u);
  });
  test('load errors keep independent problems separated and malformed JSON keeps its parse diagnostic', () => {
    const dir = skill({ routes: [{ reference: 'references/a.md', when: 'A', always: true }] });
    writeFileSync(join(dir, 'routes.json'), JSON.stringify({ routes: [{ reference: '', when: '' }] }));
    assert.throws(() => loadRoutes(dir), /reference must be a string; .*when must be a non-empty string/u);
    writeFileSync(
      join(dir, 'routes.json'),
      JSON.stringify({
        routes: [{ reference: '../sw-absent/references/a.md' }, { reference: '../sw-absent/references/b.md' }],
      }),
    );
    assert.throws(() => loadRoutes(dir), /routes\[0\][^;]*; routes\[1\]/u);
    writeFileSync(join(dir, 'routes.json'), '{');
    assert.match(routeErrors(dir, 's').join('\n'), /Unexpected|Expected property|not valid JSON/u);
  });
  test('a borrower can validate its rendered table without a local references folder', () => {
    const root = mkdtempSync(join(tmpdir(), 'borrow-only-'));
    const owner = join(root, 'sw-owner');
    const reader = join(root, 'sw-reader');
    mkdirSync(join(owner, 'references'), { recursive: true });
    mkdirSync(reader);
    writeFileSync(join(owner, 'references/a.md'), '# Reference');
    writeFileSync(
      join(owner, 'routes.json'),
      JSON.stringify({ routes: [{ reference: 'references/a.md', when: 'A', paths_any: ['**/*.php'] }] }),
    );
    writeFileSync(
      join(reader, 'routes.json'),
      JSON.stringify({ routes: [{ reference: '../sw-owner/references/a.md' }] }),
    );
    const loaded = loadRoutes(reader);
    assert.ok(loaded);
    writeFileSync(join(reader, 'SKILL.md'), renderTable(loaded));
    assert.deepEqual(routeErrors(reader, 'sw-reader'), []);
  });
});

test('a structurally valid route still fails when its reference target does not exist', () => {
  const dir = skill({ routes: [{ reference: 'references/missing.md', when: 'A', always: true }] });
  assert.deepEqual(routeErrors(dir, 's'), ['s/routes.json: routes[0]: references/missing.md not found']);
});
