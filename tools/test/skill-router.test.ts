// sw-skill-router: the installed script (plain JS, no dependencies) and the
// index it ships with. The script reimplements glob matching and routing, so
// these tests hold it to node:path matchesGlob and to the routing cases.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, matchesGlob, resolve } from 'node:path';
import { describe, test } from 'node:test';
import { pathToFileURL } from 'node:url';
import { buildIndex, metadataBlock, routerErrors, skillMetadata, summary } from '../src/router-index.ts';

const ROOT = resolve(import.meta.dirname, '../..');
const SCRIPT = join(ROOT, 'skills/sw-skill-router/scripts/route.mjs');
const mod: unknown = await import(pathToFileURL(SCRIPT).href);

function call(name: string, ...args: unknown[]): unknown {
  const f: unknown = typeof mod === 'object' && mod !== null ? Reflect.get(mod, name) : undefined;
  if (typeof f !== 'function') throw new TypeError(`route.mjs exports no ${name}`);
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
const refsFor = (path: string, line: string): string[] => {
  const result = route({ files: [{ path, lines: [line] }], kind: 'core', task: 'review' });
  return list(field(result, 'load')).flatMap((s) =>
    list(field(s, 'references')).map((r) => text(field(r, 'reference'))),
  );
};

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

  test('the repository index, metadata and help are in line', () => {
    assert.deepEqual(routerErrors(ROOT), []);
  });

  test('names a skill without metadata, a stale index and a skill the help leaves out', () => {
    const root = mkdtempSync(join(tmpdir(), 'sw-router-index-'));
    const skill = (name: string, meta: string, body = ''): void => {
      mkdirSync(join(root, 'skills', name), { recursive: true });
      writeFileSync(join(root, 'skills', name, 'SKILL.md'), `---\nname: ${name}\ndescription: X.\n${meta}---\n${body}`);
    };
    const meta = 'metadata:\n  contexts: core\n  tasks: build\n';
    skill('sw-skill-router', meta);
    skill('sw-help', meta, 'Use `sw-skill-router`.\n');
    skill('sw-alpha', meta);
    skill('sw-beta', '');
    assert.deepEqual(routerErrors(root), [
      'sw-beta: metadata.contexts is missing (core plugin app project)',
      'sw-beta: metadata.tasks is missing (build review ship answer run)',
    ]);
    skill('sw-beta', meta);
    assert.deepEqual(routerErrors(root), [
      'skills/sw-skill-router/index.json is out of date; run node tools/bin/render-router-index.ts',
      'sw-help/SKILL.md does not mention `sw-alpha`',
      'sw-help/SKILL.md does not mention `sw-beta`',
    ]);
  });

  test('a library without the router skips the check', () => {
    const root = mkdtempSync(join(tmpdir(), 'sw-no-router-'));
    mkdirSync(join(root, 'skills', 'sw-alpha'), { recursive: true });
    writeFileSync(join(root, 'skills', 'sw-alpha', 'SKILL.md'), '---\nname: sw-alpha\n---\n');
    assert.deepEqual(routerErrors(root), []);
  });

  test('the index leaves out the meta skills and resolves borrowed references', () => {
    const index = buildIndex(ROOT);
    const skills = new Set(index.skills.map((s) => s.name));
    assert.ok(!skills.has('sw-skill-router') && !skills.has('sw-help'));
    const review = index.skills.find((s) => s.name === 'sw-extension-review');
    const dal = review?.routes.find((r) => r.reference === 'sw-plugin-development/references/dal-usage.md');
    assert.ok(dal !== undefined, 'borrowed route is present');
    assert.ok(dal.anchors_any !== undefined, 'borrowed route keeps the lender triggers');
    assert.ok(dal.rules !== undefined && dal.rules.length > 0, 'route includes active rules from rules/catalog.json');
    assert.ok(
      dal.rules.every((r) => typeof r.id === 'string' && typeof r.title === 'string' && r.title.length > 0),
      'each rule carries id and non-empty title',
    );
  });

  test('the index includes only active rules for a reference and tolerates a repo without a catalog', () => {
    const root = mkdtempSync(join(tmpdir(), 'sw-router-rules-'));
    const dir = join(root, 'skills/sw-alpha');
    mkdirSync(join(dir, 'references'), { recursive: true });
    writeFileSync(
      join(dir, 'SKILL.md'),
      '---\nname: sw-alpha\ndescription: Alpha.\nmetadata:\n  contexts: core\n  tasks: build\n---\n',
    );
    writeFileSync(join(dir, 'references/a.md'), '# A\n');
    writeFileSync(
      join(dir, 'routes.json'),
      JSON.stringify({ routes: [{ reference: 'references/a.md', when: 'A.', paths_any: ['**/*.php'] }] }),
    );
    assert.equal(buildIndex(root).skills[0]?.routes[0]?.rules, undefined);

    mkdirSync(join(root, 'rules'), { recursive: true });
    writeFileSync(
      join(root, 'rules/catalog.json'),
      JSON.stringify({
        prefixes: { ALP: 'sw-alpha' },
        rules: [
          {
            id: 'ALP-002',
            skill: 'sw-alpha',
            file: 'skills/sw-alpha/references/a.md',
            title: 'Second active rule',
            status: 'active',
            since: '2026-10-20',
            eval: null,
            core_guide_ids: [],
            audience: ['core'],
            defer_on_trunk: false,
          },
          {
            id: 'ALP-001',
            skill: 'sw-alpha',
            file: 'skills/sw-alpha/references/a.md',
            title: 'First active rule',
            status: 'active',
            since: '2026-10-20',
            eval: null,
            core_guide_ids: [],
            audience: ['core'],
            defer_on_trunk: false,
          },
          {
            id: 'ALP-003',
            skill: 'sw-alpha',
            file: 'skills/sw-alpha/references/a.md',
            title: 'Retired rule',
            status: 'retired',
            retired_reason: 'Replaced.',
            since: '2026-10-20',
            eval: null,
            core_guide_ids: [],
            audience: ['core'],
            defer_on_trunk: false,
          },
        ],
      }),
    );
    assert.deepEqual(buildIndex(root).skills[0]?.routes[0]?.rules, [
      { id: 'ALP-001', title: 'First active rule' },
      { id: 'ALP-002', title: 'Second active rule' },
    ]);
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

const loadedRefs = (r: unknown): string[] =>
  list(field(r, 'load')).flatMap((s) => list(field(s, 'references')).map((x) => text(field(x, 'reference'))));

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
        expected[skill] = list(refs)
          .map((r) => (text(r).startsWith('../') ? text(r).slice(3) : `${skill}/${text(r)}`))
          .toSorted();
      }
      const result = route({ files: call('parseDiff', diff), kind: 'any', task: 'any' });
      const selected: Record<string, string[]> = {};
      for (const s of list(field(result, 'load'))) {
        const refs = list(field(s, 'references'))
          .map((r) => text(field(r, 'reference')))
          .toSorted();
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

  test('a production rule stays quiet on tests, a test rule does not', () => {
    const conn = [
      {
        path: 'src/Core/Framework/Test/Helper.php',
        lines: ['use Doctrine\\DBAL\\Connection;', 'use Shopware\\Storefront\\Page;'],
      },
    ];
    const got = loadedRefs(route({ files: conn, kind: 'core', task: 'build' }));
    assert.ok(got.includes('sw-architecture/references/anti-patterns.md'));
    assert.ok(!got.includes('sw-architecture/references/component-independence.md'));
    assert.ok(!got.includes('sw-core-development/references/platform-architecture.md'));
  });

  test('same-bundle imports do not trigger component independence', () => {
    const storefront = [{ path: 'src/Storefront/Controller/X.php', lines: ['use Shopware\\Storefront\\Page\\Y;'] }];
    const r = route({ files: storefront, kind: 'core', task: 'build' });
    const arch = list(field(r, 'load')).find((s) => text(field(s, 'name')) === 'sw-architecture');
    const refs = list(field(arch, 'references')).map((x) => text(field(x, 'reference')));
    assert.ok(!refs.includes('sw-architecture/references/component-independence.md'));
  });

  test('references count their files and prefer a production path in the reason', () => {
    const changed = [
      { path: 'tests/integration/Core/AFooTest.php', lines: [] },
      { path: 'tests/integration/Core/BFooTest.php', lines: [] },
    ];
    const r = route({ files: changed, kind: 'core', task: 'build' });
    const testing = list(field(r, 'load')).find((s) => text(field(s, 'name')) === 'sw-testing');
    const first = list(field(testing, 'references'))[0];
    assert.equal(field(first, 'hits'), 2);
    assert.match(text(field(first, 'why')), /and 1 more file\(s\)$/u);
    assert.deepEqual(field(testing, 'defers_to'), ['shopware-phpunit-tests']);
  });

  test('the script parses renames like tools/src/diff.ts', () => {
    const diff = 'diff --git a/a.php b/b.php\nrename from a.php\nrename to b.php\n';
    assert.deepEqual(call('parseDiff', diff), [
      { path: 'a.php', lines: [] },
      { path: 'b.php', lines: [] },
    ]);
  });

  test('in a project, plugin and app folders count as their own context', () => {
    assert.equal(call('fileContext', 'custom/plugins/Acme/src/Foo.php', 'project'), 'plugin');
    assert.equal(call('fileContext', 'custom/static-plugins/Acme/src/Foo.php', 'project'), 'plugin');
    assert.equal(call('fileContext', 'custom/apps/Acme/manifest.xml', 'project'), 'app');
    assert.equal(call('fileContext', 'config/packages/shopware.yaml', 'project'), 'project');
    assert.equal(call('fileContext', 'custom/plugins/Acme/src/Foo.php', 'core'), 'core');
  });

  test('an Administration helper in a Storefront Jest spec does not load sw-admin-js', () => {
    const spec = 'src/Storefront/Resources/app/storefront/test/plugin/foo.plugin.test.js';
    assert.ok(!refsFor(spec, '        await flushPromises();').some((r) => r.startsWith('sw-admin-js/')));
    const admin = 'src/Administration/Resources/app/administration/src/module/sw-foo/index.spec.js';
    assert.ok(refsFor(admin, '        await flushPromises();').includes('sw-admin-js/references/testing.md'));
  });

  test('a deprecation in Storefront JS does not load progressive enhancement', () => {
    const js = 'src/Storefront/Resources/app/storefront/src/plugin/foo.plugin.js';
    const pe = 'sw-architecture/references/progressive-enhancement.md';
    assert.ok(!refsFor(js, '     * @deprecated tag:v6.8.0 - Use onBar instead').includes(pe));
    assert.ok(refsFor('src/Core/Foo.php', '     * @deprecated tag:v6.8.0 - Use Bar instead').includes(pe));
  });

  test('"no longer" about domain state is not a history comment', () => {
    const cc = 'sw-review-learnings/references/code-comments.md';
    const php = 'src/Core/Checkout/Customer/LoginRoute.php';
    assert.ok(!refsFor(php, '        // the password no longer meets the policy, ask for a new one').includes(cc));
    assert.ok(refsFor(php, '        // this check is no longer needed since the refactoring').includes(cc));
  });
});

const loadFor = (...paths: string[]): unknown =>
  field(route({ files: files(...paths), kind: 'core', task: 'build' }), 'load');
const one = (v: unknown): unknown => list(v)[0];

describe('route.mjs frontend companion', () => {
  const MWG = 'modern-web-guidance';
  const INSTALL = 'npx skills add GoogleChrome/modern-web-guidance --skill modern-web-guidance';
  const storefront = 'src/Storefront/Resources/views/storefront/base.html.twig';
  const admin = 'src/Administration/Resources/app/administration/src/module/sw-foo/index.js';

  test('a storefront or Administration change without the skill recommends the install command', () => {
    for (const path of [storefront, admin]) {
      const got = list(call('companions', loadFor(path), new Map()));
      assert.equal(got.length, 1, path);
      assert.equal(text(field(one(got), 'name')), MWG);
      assert.equal(field(one(got), 'installed'), false);
      assert.equal(text(field(one(got), 'install')), INSTALL);
      assert.match(text(field(one(got), 'reminder')), /Bootstrap.*Meteor/u);
    }
  });

  test('an installed skill is reported with its path and no install command is needed', () => {
    const got = list(call('companions', loadFor(storefront), new Map([[MWG, '/skills/modern-web-guidance']])));
    assert.equal(field(one(got), 'installed'), true);
    assert.equal(text(field(one(got), 'path')), '/skills/modern-web-guidance/SKILL.md');
  });

  test('a backend change stays quiet', () => {
    assert.deepEqual(call('companions', loadFor('src/Core/Checkout/Cart/Cart.php'), new Map()), []);
    assert.deepEqual(call('companions', [], new Map()), []);
  });

  const cli = (extra: string[]): { out: string; json: unknown } => {
    const base = [SCRIPT, '--root', tmpdir(), '--context', 'core', '--paths', storefront, '--task', 'build'];
    const text0 = spawnSync(process.execPath, [...base, ...extra], { encoding: 'utf8' });
    assert.equal(text0.status, 0, text0.stderr);
    const json = spawnSync(process.execPath, [...base, ...extra, '--json'], { encoding: 'utf8' });
    return { out: text0.stdout, json: JSON.parse(json.stdout) };
  };

  test('the command line prints the companion section when the skill is installed', () => {
    const dir = mkdtempSync(join(tmpdir(), 'router-mwg-'));
    mkdirSync(join(dir, MWG));
    writeFileSync(join(dir, MWG, 'SKILL.md'), '---\nname: modern-web-guidance\n---\n');
    const { out, json } = cli(['--skills-dir', dir]);
    assert.match(out, /## Companion skill for frontend work/u);
    assert.match(out, /Shopware first/u);
    assert.doesNotMatch(out, /Recommended companion/u);
    assert.equal(field(one(field(json, 'companions')), 'installed'), true);
  });

  test('the command line keeps the missing list for our own skills separate from the companion', () => {
    const { json } = cli([]);
    assert.ok(!list(field(json, 'missing')).includes(MWG));
    assert.equal(text(field(one(field(json, 'companions')), 'name')), MWG);
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
    assert.deepEqual(names(field(out, 'load')).toSorted(), [
      'sw-architecture',
      'sw-php-foundation',
      'sw-plugin-development',
    ]);
  });

  test('a wrong task fails with a message', () => {
    const run = spawnSync(process.execPath, [SCRIPT, '--task', 'deploy'], { encoding: 'utf8' });
    assert.equal(run.status, 2);
    assert.match(run.stderr, /--task must be one of build, review, ship, answer, run/u);
  });

  test('runs when started through a symlinked skills folder', () => {
    const dir = mkdtempSync(join(tmpdir(), 'router-link-'));
    symlinkSync(join(ROOT, 'skills'), join(dir, 'skills'));
    const run = spawnSync(process.execPath, [join(dir, 'skills/sw-skill-router/scripts/route.mjs'), '--list'], {
      encoding: 'utf8',
    });
    assert.equal(run.status, 0, run.stderr);
    assert.match(run.stdout, /\| sw-storefront \|/u);
  });

  test('--list prints every routed skill', () => {
    const run = spawnSync(process.execPath, [SCRIPT, '--list'], { encoding: 'utf8' });
    assert.equal(run.status, 0, run.stderr);
    for (const s of buildIndex(ROOT).skills) assert.match(run.stdout, new RegExp(`\\| ${s.name} \\|`, 'u'));
  });
});

function gitInit(dir: string): void {
  const run = (args: string[]): void => {
    const r = spawnSync('git', args, { cwd: dir, encoding: 'utf8' });
    assert.equal(r.status, 0, `${args.join(' ')}: ${r.stderr}`);
  };
  run(['init', '-b', 'main']);
  run(['config', 'user.email', 'test@example.com']);
  run(['config', 'user.name', 'Test']);
  writeFileSync(join(dir, 'composer.json'), '{"type":"shopware-platform-plugin"}\n');
  run(['add', 'composer.json']);
  run(['commit', '-m', 'init']);
}

describe('route.mjs --brief and --hook', () => {
  test('--brief prints compact pointers with rule IDs and titles, and stays quiet when nothing matches', () => {
    const dir = mkdtempSync(join(tmpdir(), 'router-brief-'));
    writeFileSync(join(dir, 'composer.json'), '{"type":"shopware-platform-plugin"}\n');
    const hit = spawnSync(
      process.execPath,
      [SCRIPT, '--root', dir, '--task', 'build', '--paths', 'src/Migration/Migration1700000000Foo.php', '--brief'],
      { encoding: 'utf8' },
    );
    assert.equal(hit.status, 0, hit.stderr);
    assert.match(hit.stdout, /^Shopware skills \(plugin, task=build, 1 file\(s\)\):/u);
    assert.match(hit.stdout, /sw-plugin-development\/references\/migrations\.md/u);
    assert.match(hit.stdout, /PLG-017:/u);
    assert.doesNotMatch(hit.stdout, /## Load these skills/u);

    const miss = spawnSync(
      process.execPath,
      [SCRIPT, '--root', dir, '--task', 'build', '--paths', 'README.txt', '--brief'],
      { encoding: 'utf8' },
    );
    assert.equal(miss.status, 0, miss.stderr);
    assert.equal(miss.stdout, '');
  });

  test('--json keeps compatibility and includes rule metadata on matched references', () => {
    const dir = mkdtempSync(join(tmpdir(), 'router-json-'));
    writeFileSync(join(dir, 'composer.json'), '{"type":"shopware-platform-plugin"}\n');
    const run = spawnSync(
      process.execPath,
      [SCRIPT, '--root', dir, '--task', 'build', '--paths', 'src/Migration/Migration1700000000Foo.php', '--json'],
      { encoding: 'utf8' },
    );
    assert.equal(run.status, 0, run.stderr);
    const out: unknown = JSON.parse(run.stdout);
    const plg = list(field(out, 'load')).find((s) => text(field(s, 'name')) === 'sw-plugin-development');
    const mig = list(field(plg, 'references')).find(
      (r) => text(field(r, 'reference')) === 'sw-plugin-development/references/migrations.md',
    );
    const rules = list(field(mig, 'rules'));
    assert.ok(rules.some((r) => text(field(r, 'id')) === 'PLG-017'));
  });

  test('--hook suppresses repeated identical sets and fires again when the matched set changes', () => {
    const dir = mkdtempSync(join(tmpdir(), 'router-hook-'));
    gitInit(dir);
    const runHook = (paths: string[], extra: string[] = []): string => {
      const r = spawnSync(
        process.execPath,
        [SCRIPT, '--root', dir, '--task', 'build', '--paths', ...paths, '--hook', ...extra],
        { encoding: 'utf8' },
      );
      assert.equal(r.status, 0, r.stderr);
      return r.stdout;
    };

    const first = runHook(['src/Migration/Migration1700000000Foo.php']);
    assert.match(first, /PLG-017:/u);
    assert.equal(runHook(['src/Migration/Migration1700000000Foo.php']), '');
    // Another migration file keeps the exact same matched skill/reference set -> still silent.
    assert.equal(runHook(['src/Migration/Migration1700000001Bar.php']), '');

    // Adding a new matched reference changes the set -> prints again.
    const changed = runHook(['src/Migration/Migration1700000000Foo.php', 'src/Resources/config/services.xml']);
    assert.match(changed, /sw-architecture\/references\/extension-mechanisms\.md/u);
    assert.equal(runHook(['src/Migration/Migration1700000000Foo.php', 'src/Resources/config/services.xml']), '');

    // Returning to no matches stays silent and resets state so a later match fires again.
    assert.equal(runHook(['README.txt']), '');
    assert.match(runHook(['src/Migration/Migration1700000000Foo.php']), /PLG-017:/u);
  });

  test('--hook keeps independent state per git worktree via git rev-parse --git-dir', () => {
    const mainDir = mkdtempSync(join(tmpdir(), 'router-wt-main-'));
    const wtDir = join(mkdtempSync(join(tmpdir(), 'router-wt-branch-')), 'wt');
    gitInit(mainDir);
    const addWt = spawnSync('git', ['worktree', 'add', '-b', 'feature', wtDir], { cwd: mainDir, encoding: 'utf8' });
    assert.equal(addWt.status, 0, addWt.stderr);

    const mainState = text(call('hookStateFile', mainDir));
    const wtState = text(call('hookStateFile', wtDir));
    assert.ok(mainState.endsWith('sw-skill-router-hook.state'));
    assert.ok(wtState.endsWith('sw-skill-router-hook.state'));
    assert.notEqual(mainState, wtState);
    assert.match(wtState, /worktrees/u);

    const args = ['--task', 'build', '--paths', 'src/Migration/Migration1700000000Foo.php', '--hook'];
    const rMain = spawnSync(process.execPath, [SCRIPT, '--root', mainDir, ...args], { encoding: 'utf8' });
    assert.equal(rMain.status, 0, rMain.stderr);
    assert.match(rMain.stdout, /PLG-017:/u);

    // Worktree has its own state, so the first hook call there still fires.
    const rWt1 = spawnSync(process.execPath, [SCRIPT, '--root', wtDir, ...args], { encoding: 'utf8' });
    assert.equal(rWt1.status, 0, rWt1.stderr);
    assert.match(rWt1.stdout, /PLG-017:/u);

    // Second call in the worktree is suppressed.
    const rWt2 = spawnSync(process.execPath, [SCRIPT, '--root', wtDir, ...args], { encoding: 'utf8' });
    assert.equal(rWt2.status, 0, rWt2.stderr);
    assert.equal(rWt2.stdout, '');
  });

  test('--hook outside a git repository prints without failing', () => {
    const dir = mkdtempSync(join(tmpdir(), 'router-nogit-'));
    writeFileSync(join(dir, 'composer.json'), '{"type":"shopware-platform-plugin"}\n');
    assert.equal(call('hookStateFile', dir), null);
    const r = spawnSync(
      process.execPath,
      [SCRIPT, '--root', dir, '--task', 'build', '--paths', 'src/Migration/Migration1700000000Foo.php', '--hook'],
      { encoding: 'utf8' },
    );
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /PLG-017:/u);
  });
});
