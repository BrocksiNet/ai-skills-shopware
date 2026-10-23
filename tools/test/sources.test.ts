// rules/sources.json (plan WP12 step 1).
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, test } from 'node:test';
import { checkSources, loadSources, type Source, skillsForPath, sourceErrors } from '../src/sources.ts';

const ROOT = resolve(import.meta.dirname, '../..');
const SKILLS = readdirSync(join(ROOT, 'skills'));

const valid = {
  id: 'up',
  repo: 'acme/skills',
  branch: 'main',
  extractor: 'markdown',
  paths: ['skills'],
  skills: [{ path: 'skills/phpunit', skills: ['sw-testing'] }],
};

describe('rules/sources.json', () => {
  test('the committed file is valid and names existing skills', () => {
    assert.deepEqual(sourceErrors(ROOT, SKILLS), []);
    const ids = loadSources(ROOT).map((s) => s.id);
    assert.equal(ids[0], 'shopware', 'trunk stays the first source');
    assert.ok(ids.includes('ai-coding-tools'));
  });
  test('field errors name the source', () => {
    const { sources, errors } = checkSources(
      {
        sources: [
          valid,
          { ...valid, id: 'Bad Id', repo: 'nope', extractor: 'html', paths: [] },
          { ...valid, skills: [{ path: 'x', skills: ['sw-nope'] }] },
          valid,
        ],
      },
      SKILLS,
    );
    assert.deepEqual(
      sources.map((s) => s.id),
      ['up'],
    );
    assert.ok(errors.includes('Bad Id: id must match ^[a-z0-9-]+$'), errors.join('\n'));
    assert.ok(errors.includes('Bad Id: repo must be owner/name'));
    assert.ok(errors.includes('Bad Id: extractor must be one of shopware-trunk, markdown'));
    assert.ok(errors.includes('Bad Id: paths must be a non-empty list of strings'));
    assert.ok(errors.includes('up: skills[0] names unknown skill sw-nope'));
    assert.ok(errors.includes('up: duplicate source id'));
    assert.deepEqual(checkSources([]).errors, ['sources must be a list']);
  });
  test('skills by path prefix, not by substring', () => {
    const source: Source = {
      id: 'up',
      repo: 'acme/skills',
      branch: 'main',
      extractor: 'markdown',
      paths: ['skills'],
      skills: [
        { path: 'skills/phpunit', skills: ['sw-testing'] },
        { path: 'skills', skills: ['sw-php-foundation'] },
      ],
    };
    assert.deepEqual(skillsForPath(source, 'skills/phpunit/SKILL.md'), ['sw-testing', 'sw-php-foundation']);
    assert.deepEqual(skillsForPath(source, 'skills/phpunit-extra/SKILL.md'), ['sw-php-foundation']);
    assert.deepEqual(skillsForPath(source, 'README.md'), []);
  });
});

describe('catalog upstream links', () => {
  test('a rule citing an unknown source is an error', () => {
    const root = mkdtempSync(join(tmpdir(), 'sources-'));
    mkdirSync(join(root, 'rules'));
    writeFileSync(join(root, 'rules/sources.json'), JSON.stringify({ sources: [valid] }));
    const rule = {
      id: 'TEST-900',
      skill: 'sw-testing',
      file: 'skills/sw-testing/SKILL.md',
      title: 't',
      status: 'active',
      since: '2026-10-23',
      eval: null,
      eval_reason: 'r',
      core_guide_ids: [],
      audience: ['plugin'],
      defer_on_trunk: false,
    };
    const rules = [
      { ...rule, upstream: [{ source: 'up', path: 'skills/phpunit/SKILL.md#a' }] },
      { ...rule, id: 'TEST-901', upstream: [{ source: 'gone', path: 'x.md' }] },
    ];
    writeFileSync(join(root, 'rules/catalog.json'), JSON.stringify({ prefixes: {}, rules }));
    assert.deepEqual(sourceErrors(root, SKILLS), ['TEST-901: upstream names unknown source gone']);
  });
});
