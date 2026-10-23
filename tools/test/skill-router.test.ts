// sw-skill-router: the installed script (plain JS, no dependencies) and the
// index it ships with. The script reimplements glob matching and routing, so
// these tests hold it to node:path matchesGlob and to the routing cases.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, matchesGlob, resolve } from 'node:path';
import { describe, test } from 'node:test';
import { pathToFileURL } from 'node:url';
import { buildIndex, metadataBlock, skillMetadata, summary } from '../src/router-index.ts';

const ROOT = resolve(import.meta.dirname, '../..');
const SCRIPT = join(ROOT, 'skills/sw-skill-router/scripts/route.mjs');
const mod: unknown = await import(pathToFileURL(SCRIPT).href);

function call(name: string, ...args: unknown[]): unknown {
  const f: unknown = typeof mod === 'object' && mod !== null ? Reflect.get(mod, name) : undefined;
  if (typeof f !== 'function') throw new Error(`route.mjs exports no ${name}`);
  const result: unknown = Reflect.apply(f, undefined, args);
  return result;
}

const field = (v: unknown, key: string): unknown =>
  typeof v === 'object' && v !== null ? Reflect.get(v, key) : undefined;
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const text = (v: unknown): string => (typeof v === 'string' ? v : '');
const names = (v: unknown): string[] => list(v).map((s) => text(field(s, 'name')));

interface Route {
  files: unknown;
  kind: string;
  task: string;
}
const route = (r: Route): unknown => call('route', r);
const files = (...paths: string[]): unknown => paths.map((path) => ({ path, lines: [] }));

describe('router index', () => {
  test('reads the metadata block of the frontmatter', () => {
    const md = '---\nname: x\ndescription: y\nmetadata:\n  contexts: core plugin\n  paths: "**/*.php"\n---\n# X\n';
    assert.deepEqual(
      [...metadataBlock(md)],
      [
        ['contexts', 'core plugin'],
        ['paths', '**/*.php'],
      ],
    );
  });

  test('names missing and unknown metadata values', () => {
    const md = '---\nname: x\nmetadata:\n  contexts: core shop\n  tasks: build\n  load_for: review\n---\n';
    assert.deepEqual(skillMetadata(md).errors, [
      "metadata.contexts: unknown value 'shop'",
      "metadata.load_for (must be one of its tasks): unknown value 'review'",
    ]);
    assert.match(skillMetadata('---\nname: x\n---\n').errors.join(' '), /contexts is missing.*tasks is missing/u);
  });

  test('a summary is the first sentence of the description', () => {
    assert.equal(summary('Build apps: manifests. Use when x.'), 'Build apps: manifests.');
    assert.equal(summary('No stop'), 'No stop');
  });

  test('the index leaves out the meta skills and resolves borrowed references', () => {
    const index = buildIndex(ROOT);
    const skills = new Set(index.skills.map((s) => s.name));
    assert.ok(!skills.has('sw-skill-router') && !skills.has('sw-help'));
    const review = index.skills.find((s) => s.name === 'sw-extension-review');
    const dal = review?.routes.find((r) => r.reference === 'sw-plugin-development/references/dal-usage.md');
    assert.ok(dal?.anchors_any !== undefined, 'borrowed route keeps the lender triggers');
  });
});

describe('route.mjs glob matching', () => {
  const index = buildIndex(ROOT);
  const globs = [...new Set(index.skills.flatMap((s) => s.paths.concat(s.routes.flatMap((r) => r.paths_any ?? []))))];
  // Paths that should match each glob, plus a fixed set of near misses.
  const derived = globs.map((g) =>
    g
      .replaceAll(/\{([^,}]*)[^}]*\}/gu, '$1')
      .replaceAll('**', 'a/b')
      .replaceAll('*', 'x')
      .replaceAll('?', 'q'),
  );
  const paths = [
    ...derived,
    'src/Resources/config/services.xml',
    'custom/plugins/A/src/Resources/config/services.php',
    'src/Core/Framework/Resources/config/packages/feature.yaml',
    '.env',
    'a/.env.local',
    '.github/compose.yml',
    'x/.hidden/a.php',
    'tests/unit/Core/FooTest.php',
    'custom/plugins/A/tests/FooTest.php',
    'composer.json',
    'manifest.xml',
    'UPGRADE-6.7.md',
    'adr/2020-01-01-x.md',
    'phpstan-baseline.neon',
    'src/Administration/Resources/app/administration/src/module/sw-x/index.ts',
    'src/Storefront/Resources/views/storefront/page/a.html.twig',
  ];

  test('agrees with node:path matchesGlob on every route glob', () => {
    const wrong = globs.flatMap((g) =>
      paths.filter((p) => call('matchesGlob', p, g) !== matchesGlob(p, g)).map((p) => `${g} on ${p}`),
    );
    assert.deepEqual(wrong, []);
  });
});

describe('route.mjs routing', () => {
  test('selects what tools/bin/route.ts selects for every routing case, with no filter', () => {
    const cases = join(ROOT, 'evals/routing');
    for (const name of readdirSync(cases)) {
      const diff = readFileSync(join(cases, name, 'diff.patch'), 'utf8');
      const expectedRaw: unknown = JSON.parse(readFileSync(join(cases, name, 'expected.json'), 'utf8'));
      const expected: Record<string, string[]> = {};
      for (const [skill, refs] of Object.entries(
        typeof expectedRaw === 'object' && expectedRaw !== null ? expectedRaw : {},
      )) {
        expected[skill] = list(refs).map((r) => (text(r).startsWith('../') ? text(r).slice(3) : `${skill}/${text(r)}`));
      }
      const result = route({ files: call('parseDiff', diff), kind: 'any', task: 'any' });
      const selected: Record<string, string[]> = {};
      for (const s of list(field(result, 'load'))) {
        const refs = list(field(s, 'references')).map((r) => text(field(r, 'reference')));
        if (refs.length > 0) selected[text(field(s, 'name'))] = refs;
      }
      assert.deepEqual(selected, expected, name);
    }
  });

  test('a plugin services.xml skips the core skill and names why', () => {
    const result = route({ files: files('src/Resources/config/services.xml'), kind: 'plugin', task: 'build' });
    const loaded = new Set(names(field(result, 'load')));
    assert.ok(loaded.has('sw-plugin-development'));
    assert.ok(!loaded.has('sw-core-development'));
    const skipped = list(field(result, 'skipped')).map((s) => `${text(field(s, 'name'))}: ${text(field(s, 'reason'))}`);
    assert.deepEqual(skipped, ['sw-core-development: for core only', 'sw-extension-review: not for build']);
  });

  test('the same file in core loads the core skill and not the plugin one', () => {
    const result = route({ files: files('src/Resources/config/services.xml'), kind: 'core', task: 'build' });
    assert.ok(names(field(result, 'load')).includes('sw-core-development'));
    assert.ok(!names(field(result, 'load')).includes('sw-plugin-development'));
  });

  test('a task loads its procedure skills with no file at all', () => {
    assert.deepEqual(names(field(route({ files: [], kind: 'plugin', task: 'review' }), 'load')), [
      'sw-extension-review',
      'sw-review-learnings',
    ]);
    assert.deepEqual(names(field(route({ files: [], kind: 'core', task: 'ship' }), 'load')), [
      'sw-change-impact',
      'sw-pr-description',
    ]);
  });

  test('in a project, plugin and app folders count as their own context', () => {
    assert.equal(call('fileContext', 'custom/plugins/Acme/src/Foo.php', 'project'), 'plugin');
    assert.equal(call('fileContext', 'custom/static-plugins/Acme/src/Foo.php', 'project'), 'plugin');
    assert.equal(call('fileContext', 'custom/apps/Acme/manifest.xml', 'project'), 'app');
    assert.equal(call('fileContext', 'config/packages/shopware.yaml', 'project'), 'project');
    assert.equal(call('fileContext', 'custom/plugins/Acme/src/Foo.php', 'core'), 'core');
  });
});

const kind = (dir: string): string => text(field(call('detectContext', dir), 'kind'));

describe('route.mjs context detection', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'sw-router-'));
  const repo = (name: string, entries: Record<string, string>): string => {
    const dir = join(tmp, name);
    for (const [file, content] of Object.entries(entries)) {
      mkdirSync(join(dir, file, '..'), { recursive: true });
      writeFileSync(join(dir, file), content);
    }
    mkdirSync(dir, { recursive: true });
    return dir;
  };

  test('core, plugin, app, project and none', () => {
    assert.equal(kind(repo('core', { 'composer.json': '{"name":"shopware/shopware"}' })), 'core');
    assert.equal(kind(repo('kernel', { 'src/Core/Kernel.php': '<?php' })), 'core');
    assert.equal(kind(repo('plugin', { 'composer.json': '{"type":"shopware-platform-plugin"}' })), 'plugin');
    assert.equal(kind(repo('app', { 'manifest.xml': '<manifest/>' })), 'app');
    assert.equal(kind(repo('project', { 'composer.json': '{"require":{"shopware/core":"~6.7.0"}}' })), 'project');
    assert.equal(kind(repo('none', { 'package.json': '{}' })), 'any');
  });

  test('the command line routes planned paths in a plugin repository', () => {
    const dir = repo('cli-plugin', { 'composer.json': '{"type":"shopware-platform-plugin"}' });
    const run = spawnSync(
      process.execPath,
      [
        SCRIPT,
        '--root',
        dir,
        '--paths',
        'src/Foo.php',
        'src/Resources/config/services.xml',
        '--task',
        'build',
        '--json',
      ],
      { encoding: 'utf8' },
    );
    assert.equal(run.status, 0, run.stderr);
    const out: unknown = JSON.parse(run.stdout);
    assert.equal(text(field(field(out, 'context'), 'kind')), 'plugin');
    assert.equal(text(field(out, 'source')), 'planned paths');
    assert.deepEqual(names(field(out, 'load')), ['sw-architecture', 'sw-php-foundation', 'sw-plugin-development']);
  });

  test('a wrong task fails with a message', () => {
    const run = spawnSync(process.execPath, [SCRIPT, '--task', 'deploy'], { encoding: 'utf8' });
    assert.equal(run.status, 2);
    assert.match(run.stderr, /--task must be one of build, review, ship, answer, run/u);
  });

  test('--list prints every routed skill', () => {
    const run = spawnSync(process.execPath, [SCRIPT, '--list'], { encoding: 'utf8' });
    assert.equal(run.status, 0, run.stderr);
    for (const s of buildIndex(ROOT).skills) assert.match(run.stdout, new RegExp(`\\| ${s.name} \\|`, 'u'));
  });
});
