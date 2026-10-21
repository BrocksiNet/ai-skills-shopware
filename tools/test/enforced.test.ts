import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type { Enforcement, Rule } from '../src/catalog.ts';
import {
  END,
  HEADING,
  MAX_BULLETS,
  REFERENCE,
  START,
  applySection,
  render,
  renderBlock,
  renderBullet,
  type EnforcedItem,
} from '../src/enforced.ts';

function item(id: string, check: Partial<Enforcement> = {}): EnforcedItem {
  const rule: Rule = {
    id,
    skill: 'shopware-testing',
    file: 'skills/shopware-testing/SKILL.md',
    title: id,
    status: 'active',
    since: '2026-10-20',
    eval: null,
    eval_reason: 'x',
    core_guide_ids: [],
    audience: ['core'],
    defer_on_trunk: false,
  };
  return {
    rule,
    check: {
      tool: 'NoDropStatementInUpdateRule',
      kind: 'phpstan',
      catches: 'catches top-level `DROP` in `update()`.',
      misses: 'drops inside `if` and `sprintf` SQL',
      trunk_only: true,
      ...check,
    },
  };
}

const SKILL = '# Skill\n\nBody.\n\n## Definition of done\n\n- [ ] Done.\n';

describe('renderBullet', () => {
  test('names the rule, the tool, where it runs and the gap', () => {
    assert.equal(
      renderBullet(item('CORE-001')),
      '- `CORE-001` `NoDropStatementInUpdateRule` (PHPStan, trunk only) catches top-level `DROP` in `update()`. ' +
        'It misses drops inside `if` and `sprintf` SQL; flag those.',
    );
  });

  test('omits "trunk only" for checks that run everywhere', () => {
    assert.match(renderBullet(item('REV-017', { kind: 'ecs', trunk_only: false })), /\(ECS\) /u);
  });
});

describe('renderBlock', () => {
  test('explains trunk-only checks only when there is one', () => {
    assert.match(renderBlock([item('A-001')]), /trunk only\* are not active in plugin/u);
    assert.doesNotMatch(renderBlock([item('A-001', { trunk_only: false })]), /trunk only\*/u);
  });
});

describe('applySection', () => {
  test('appends the section when a skill gains enforced rules', () => {
    const out = applySection(SKILL, [item('TEST-001')]);
    assert.ok(out.startsWith(SKILL));
    assert.ok(out.includes(`\n${HEADING}\n\n${START}\n`));
    assert.ok(out.endsWith(`${END}\n`));
  });

  test('is idempotent', () => {
    const once = applySection(SKILL, [item('TEST-001')]);
    assert.equal(applySection(once, [item('TEST-001')]), once);
  });

  test('replaces only the generated block', () => {
    const once = applySection(SKILL, [item('TEST-001')]);
    const twice = applySection(once, [item('TEST-001'), item('TEST-002')]);
    assert.ok(twice.startsWith(SKILL));
    assert.equal(twice.split(HEADING).length, 2);
    assert.ok(twice.includes('`TEST-002`'));
  });

  test('keeps text after the section', () => {
    const withTail = applySection(SKILL, [item('TEST-001')]) + '\n## Further reading\n\n- Link.\n';
    const out = applySection(withTail, [item('TEST-002')]);
    assert.ok(out.endsWith('## Further reading\n\n- Link.\n'));
    assert.ok(out.includes('`TEST-002`') && !out.includes('`TEST-001`'));
  });

  test('drops the section when no rule is enforced any more', () => {
    assert.equal(applySection(applySection(SKILL, [item('TEST-001')]), []), SKILL);
  });

  test('leaves a skill without enforced rules alone', () => {
    assert.equal(applySection(SKILL, []), SKILL);
  });

  test('rejects unbalanced markers', () => {
    assert.throws(() => applySection(`${SKILL}${START}\n`, []), /unbalanced/u);
  });
});

const many = (n: number): EnforcedItem[] =>
  Array.from({ length: n }, (_, i) => item(`TEST-${String(i + 1).padStart(3, '0')}`));

describe('render', () => {
  test(`keeps up to ${MAX_BULLETS} checks in SKILL.md`, () => {
    const out = render(SKILL, many(MAX_BULLETS));
    assert.equal(out.reference, null);
    assert.equal(out.skill.split('\n- `TEST-').length - 1, MAX_BULLETS);
  });

  test('moves a longer list to the reference and links it', () => {
    const out = render(SKILL, many(MAX_BULLETS + 1));
    assert.match(out.reference ?? '', /`TEST-011`/u);
    assert.ok(out.skill.includes(`](${REFERENCE})`));
    assert.doesNotMatch(out.skill, /\n- `TEST-/u);
  });
});
