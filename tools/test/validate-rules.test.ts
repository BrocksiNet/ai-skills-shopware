import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { after, describe, test } from 'node:test';
import { validateRules } from '../src/validate-rules.ts';

const REPO = resolve(import.meta.dirname, '../..');
const SKILL = 'skills/shopware-testing/SKILL.md';
const REF = 'skills/shopware-testing/references/shape.md';

const tmp: string[] = [];
after(() => {
  for (const d of tmp) rmSync(d, { recursive: true, force: true });
});

/** A catalog entry as JSON: the cases write invalid values too. */
type Entry = Record<string, unknown>;
interface CatalogJson {
  prefixes: Record<string, string>;
  rules: Entry[];
}

function rule(id: string, overrides: Entry = {}): Entry {
  return {
    id,
    skill: 'shopware-testing',
    file: SKILL,
    title: `Rule ${id}`,
    status: 'active',
    since: '2026-10-20',
    eval: 'some-task',
    core_guide_ids: [],
    audience: ['core'],
    defer_on_trunk: false,
    ...overrides,
  };
}

/** A minimal repo: two tagged rules in SKILL.md, one eval task. */
function fixture(edit: (files: Record<string, string>, catalog: CatalogJson) => void = () => {}): string {
  const files: Record<string, string> = {
    [SKILL]: '# Testing\n\n- **TEST-001** First rule.\n- **TEST-002** Second rule, see `TEST-001`.\n',
    [REF]: '# Shape\n\nNo rules here.\n',
    'evals/tasks/some-task/grade.sh': '',
  };
  const catalog: CatalogJson = {
    prefixes: { TEST: 'shopware-testing', PLG: 'shopware-plugin-development' },
    rules: [rule('TEST-001'), rule('TEST-002', { eval: null, eval_reason: 'Documented only.' })],
  };
  edit(files, catalog);
  const root = mkdtempSync(join(tmpdir(), 'validate-rules-'));
  tmp.push(root);
  files['rules/catalog.json'] = JSON.stringify(catalog);
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  return root;
}

/** Rule `i` of the fixture catalog. */
function ruleAt(c: CatalogJson, i: number): Entry {
  const entry = c.rules[i];
  assert.ok(entry);
  return entry;
}

function errorsFor(edit: Parameters<typeof fixture>[0]): string[] {
  return validateRules(fixture(edit)).errors;
}

describe('validateRules', () => {
  test('the repository catalog is valid', () => {
    const report = validateRules(REPO);
    assert.deepEqual(report.errors, []);
    assert.ok(report.active > 0);
  });

  test('a consistent fixture passes and reports coverage', () => {
    const report = validateRules(fixture());
    assert.deepEqual(report.errors, []);
    assert.equal(report.active, 2);
    assert.equal(report.withEval, 1);
    assert.deepEqual(report.bySkill, [{ skill: 'shopware-testing', active: 2, withEval: 1 }]);
  });

  const cases: [string, Parameters<typeof fixture>[0], string][] = [
    [
      'missing eval task',
      (_, c) => {
        ruleAt(c, 0).eval = 'no-such-task';
      },
      'TEST-001: eval task no-such-task not found',
    ],
    [
      'no eval and no reason',
      (_, c) => {
        ruleAt(c, 1).eval_reason = '';
      },
      'TEST-002: active rule needs eval or eval_reason',
    ],
    [
      'prefix of another skill',
      (_, c) => {
        ruleAt(c, 0).skill = 'shopware-plugin-development';
      },
      'TEST-001: prefix belongs to shopware-testing, not shopware-plugin-development',
    ],
    [
      'unknown prefix',
      (f, c) => {
        f[SKILL] += '- **ZZZ-001** Odd.\n';
        c.rules.push(rule('ZZZ-001'));
      },
      'ZZZ-001: unknown prefix',
    ],
    [
      'malformed ID',
      (f, c) => {
        f[SKILL] += '- **TEST-1** Short.\n';
        c.rules.push(rule('TEST-1'));
      },
      'TEST-1: ID must be PREFIX-NNN',
    ],
    [
      'duplicate catalog entry',
      (_, c) => {
        c.rules.push(rule('TEST-001'));
      },
      'TEST-001: duplicated in the catalog',
    ],
    [
      'retired but inline',
      (_, c) => {
        ruleAt(c, 0).status = 'retired';
      },
      `${SKILL}:3: TEST-001 is retired but still inline`,
    ],
    [
      'bad status',
      (_, c) => {
        ruleAt(c, 0).status = 'gone';
      },
      'TEST-001: bad status gone',
    ],
    [
      'superseded by an unknown rule',
      (_, c) => {
        ruleAt(c, 0).status = 'superseded:TEST-404';
      },
      'TEST-001: superseded by unknown TEST-404',
    ],
    [
      'dangling see',
      (_, c) => {
        ruleAt(c, 0).see = ['TEST-404'];
      },
      'TEST-001: see TEST-404 is unknown or inactive',
    ],
    [
      'wrong file',
      (_, c) => {
        ruleAt(c, 0).file = REF;
      },
      `TEST-001: inline in ${SKILL}, catalog says ${REF}`,
    ],
    [
      'missing file',
      (_, c) => {
        ruleAt(c, 0).file = 'skills/shopware-testing/nope.md';
      },
      'TEST-001: file skills/shopware-testing/nope.md not found',
    ],
    [
      'unknown audience',
      (_, c) => {
        ruleAt(c, 0).audience = ['robots'];
      },
      'TEST-001: unknown audience robots',
    ],
    [
      'bad date',
      (_, c) => {
        ruleAt(c, 0).since = 'today';
      },
      'TEST-001: since must be YYYY-MM-DD',
    ],
    [
      'not inline',
      (f) => {
        f[SKILL] = (f[SKILL] ?? '').replace('**TEST-001** ', '');
      },
      'TEST-001: active rule not found inline in skills/',
    ],
    [
      'defined twice',
      (f) => {
        f[REF] += '- **TEST-001** Again.\n';
      },
      `TEST-001: defined inline 2 times (${SKILL}:3, ${REF}:4)`,
    ],
    [
      'orphan inline ID',
      (f) => {
        f[REF] += '- **TEST-999** Orphan.\n';
      },
      `${REF}:4: TEST-999 has no catalog entry`,
    ],
    [
      'dangling reference',
      (f) => {
        f[REF] += 'See `PLG-404`.\n';
      },
      `${REF}:4: reference to unknown or inactive PLG-404`,
    ],
    [
      'incomplete enforcement',
      (_, c) => {
        ruleAt(c, 0).trunk = { enforced_by: [{ tool: 'X', kind: 'grep', catches: '', misses: 'y', trunk_only: true }] };
      },
      'TEST-001: trunk.enforced_by[0].catches must be a non-empty string',
    ],
    [
      'stale enforced section',
      (_, c) => {
        ruleAt(c, 0).trunk = {
          enforced_by: [{ tool: 'X', kind: 'phpstan', catches: 'catches x', misses: 'y', trunk_only: true }],
        };
      },
      `${SKILL}: out of date; run node tools/bin/render-enforced.ts`,
    ],
    [
      'wrong field type',
      (_, c) => {
        ruleAt(c, 0).defer_on_trunk = 'no';
      },
      'TEST-001: defer_on_trunk must be true or false',
    ],
  ];
  for (const [name, edit, expected] of cases) {
    test(`reports: ${name}`, () => {
      assert.ok(errorsFor(edit).includes(expected), errorsFor(edit).join('\n'));
    });
  }
});
