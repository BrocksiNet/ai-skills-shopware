import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { after, describe, test } from 'node:test';
import {
  frontmatter,
  lineCount,
  overlapErrors,
  referenceLinks,
  registryDuplicates,
  textLength,
  triggerPhrases,
} from '../src/skill-checks.ts';
import { validateSkills } from '../src/validate-skills.ts';

const ROOT = resolve(import.meta.dirname, '../..');
const tmp = mkdtempSync(join(tmpdir(), 'validate-skills-test-'));
after(() => {
  rmSync(tmp, { recursive: true, force: true });
});

function validate(root: string): { rc: number; out: string } {
  let out = '';
  const rc = validateSkills({
    root,
    out: (t) => {
      out += t;
    },
    err: (t) => {
      out += t;
    },
  });
  return { rc, out };
}

const REGISTRY = ['# Registry', '', '## Coverage matrix', '', '| Topic | Owner |', '| ----- | ----- |'];

let n = 0;
/** A repo of `files` (path -> text) with an empty rule catalog. */
function repo(files: Record<string, string>): string {
  const root = join(tmp, `repo-${++n}`);
  const all = { 'rules/catalog.json': '{"prefixes":{},"rules":[]}\n', 'REGISTRY.md': REGISTRY.join('\n'), ...files };
  for (const [path, text] of Object.entries(all)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  return root;
}

const skill = (name: string, description: string, body = ''): Record<string, string> => ({
  [`skills/${name}/SKILL.md`]: `---\nname: ${name}\ndescription: ${description}\nlicense: MIT\n---\n\n${body}`,
  [`skills/${name}/evals/should-trigger.md`]: '- a\n',
  [`skills/${name}/evals/should-not-trigger.md`]: '- b\n',
});

describe('frontmatter', () => {
  test('name unquoted, folded description joined into one line', () => {
    const md = ['---', "name: 'alpha' ", 'description: >-', '  Use for "x"', '', '  and y.', 'license: MIT', '---'];
    assert.deepEqual(frontmatter(md.join('\n')), { name: 'alpha', description: 'Use for "x"  and y.' });
  });
  test('inline description; a key without a value also ends it', () => {
    const md = ['---', 'name: beta', 'description: Short one', 'metadata:', '  owner: me', '---', 'name: body'];
    assert.deepEqual(frontmatter(md.join('\n')), { name: 'beta', description: 'Short one' });
  });
  test('no frontmatter gives empty values', () => {
    assert.deepEqual(frontmatter('# Title\nname: x\n'), { name: '', description: '' });
  });
});

describe('text checks', () => {
  test('length in characters, lines as wc -l counts them', () => {
    assert.equal(textLength('ä€😀'), 3);
    assert.deepEqual([lineCount('a\nb\n'), lineCount('a\nb'), lineCount('')], [2, 1, 0]);
  });
  test('only real reference links, sorted and unique', () => {
    const md = 'See [b](references/b.md), [a](references/sub/a.md), [b](references/b.md) and references/c.md.';
    assert.deepEqual(referenceLinks(md), ['references/b.md', 'references/sub/a.md']);
  });
  test('trigger phrases and their overlaps', () => {
    assert.deepEqual(triggerPhrases('Use for "write a test" or "fix it", not ""'), ['write a test', 'fix it']);
    const phrases = new Map([
      ['b', ['same', 'own']],
      ['a', ['same', 'same']],
      ['c', ['once']],
    ]);
    assert.deepEqual(overlapErrors(phrases), ['overlapping trigger phrase "same" claimed by: a b']);
    assert.deepEqual(overlapErrors(new Map([['a', ['twice', 'twice']]])), []);
  });
  test('duplicate topics only inside the coverage matrix', () => {
    const registry = [
      ...REGISTRY,
      '| Testing | a |',
      '| Testing | b |',
      '| Admin | c |',
      '',
      '## Other',
      '| Admin | d |',
    ];
    assert.deepEqual(registryDuplicates(registry.join('\n')), ['Testing']);
  });
});

describe('validateSkills', () => {
  test('the repository is valid', () => {
    const r = validate(ROOT);
    assert.equal(r.rc, 0, r.out);
    assert.match(r.out, /^Checking sw-testing$/mu);
    assert.match(r.out, /\nvalidate-skills: OK\n$/u);
  });
  test('reports every error and counts them', () => {
    const root = repo({
      ...skill('alpha', 'Use for "write a test".', 'See [x](references/x.md).\n'),
      ...skill('beta', 'Also "write a test".', 'line\n'.repeat(500)),
      'skills/gamma/SKILL.md': '---\nname: gamma2\ndescription:\n---\n',
      'skills/empty/.keep': '',
      'REGISTRY.md': [...REGISTRY, '| Testing | alpha |', '| Testing | beta |'].join('\n'),
    });
    const r = validate(root);
    assert.equal(r.rc, 1);
    const errors = r.out.split('\n').filter((l) => l.startsWith('  ERROR: '));
    assert.deepEqual(errors, [
      '  ERROR: alpha: dead internal link references/ -> references/x.md',
      '  ERROR: beta: SKILL.md is 506 lines (>= 500)',
      '  ERROR: empty: missing SKILL.md',
      "  ERROR: gamma: frontmatter name 'gamma2' != folder name",
      '  ERROR: gamma: empty description',
      '  ERROR: gamma: missing evals/should-trigger.md',
      '  ERROR: gamma: missing evals/should-not-trigger.md',
      '  ERROR: overlapping trigger phrase "write a test" claimed by: alpha beta',
      "  ERROR: duplicate topic ownership in REGISTRY.md: 'Testing'",
    ]);
    assert.match(r.out, /\nvalidate-skills: 9 error\(s\)\n$/u);
  });
  test('a long description, a missing registry and a broken catalog', () => {
    const root = repo({ ...skill('alpha', 'x'.repeat(1024)), 'rules/catalog.json': '{' });
    rmSync(join(root, 'REGISTRY.md'));
    const r = validate(root);
    assert.equal(r.rc, 1);
    assert.match(r.out, /alpha: description is 1024 chars \(>= 1024\)/u);
    assert.match(r.out, /ERROR: REGISTRY\.md not found/u);
    assert.match(r.out, /validate-rules: cannot read the catalog/u);
    assert.match(r.out, /ERROR: rule catalog check failed \(see above\)/u);
    assert.match(r.out, /validate-skills: 3 error\(s\)/u);
  });
});
