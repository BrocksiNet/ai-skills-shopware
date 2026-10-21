import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { changedLines, commitDeltas, ruleClass, type TrunkFile } from '../src/trunk-deltas.ts';

const file = (filename: string, patch?: string, status = 'modified'): TrunkFile => ({
  filename,
  status,
  additions: 1,
  deletions: 1,
  ...(patch === undefined ? {} : { patch }),
});

describe('changed lines', () => {
  test('added and removed lines that match; moved lines cancel out', () => {
    const patch = [
      '@@ -1,4 +1,4 @@',
      ' - context',
      '-- moved',
      '+- new rule',
      '+- moved',
      '-not a bullet',
      '+++ header-like',
    ].join('\n');
    assert.deepEqual(changedLines('f.md', patch, /^\s*[-*]\s+(.+)$/u), [
      { file: 'f.md', change: '+', text: 'new rule' },
    ]);
  });
});

describe('rule classes', () => {
  test('PHPStan and Danger rules by file name, anything else not', () => {
    assert.deepEqual(
      ruleClass(file('src/Core/DevOps/StaticAnalyze/PHPStan/Rules/Tests/FooRule.php', undefined, 'added')),
      {
        file: 'src/Core/DevOps/StaticAnalyze/PHPStan/Rules/Tests/FooRule.php',
        name: 'FooRule',
        kind: 'phpstan',
        status: 'added',
      },
    );
    assert.equal(ruleClass(file('src/Core/DevOps/StaticAnalyze/Danger/Rules/Bar.php'))?.kind, 'danger');
    assert.equal(ruleClass(file('src/Core/DevOps/StaticAnalyze/PHPStan/rules.neon')), undefined);
    assert.equal(ruleClass(file('tests/devops/Core/DevOps/StaticAnalyse/PHPStan/Rules/FooRuleTest.php')), undefined);
  });
});

describe('commit deltas', () => {
  test('each watched file feeds its own list; a missing patch is reported', () => {
    const deltas = commitDeltas({
      sha: 'x',
      title: 't',
      date: 'd',
      files: [
        file('.agents/skills/shopware-php-code/SKILL.md', '+- Use the clock\n+Prose line'),
        file(
          '.agents/skills/sw-review/guides/bc-php.md',
          '+  - { id: BCPHP-011, since: 2026-10-25 }\n-  - { id: BCPHP-003, since: x }',
        ),
        file('.agents/skills/sw-review/personas/ux.md', '+- persona bullet'),
        file('coding-guidelines/core/unit-tests.md', '+## New section\n+- a bullet'),
        file('.github/PULL_REQUEST_TEMPLATE.md', '+- [ ] new box\n+'),
        file('coding-guidelines/core/huge.md'),
        file('src/Core/Checkout/Cart.php', '+# not a heading'),
      ],
    });
    assert.deepEqual(
      deltas.bullets.map((l) => l.text),
      ['Use the clock'],
    );
    assert.deepEqual(
      deltas.guideIds.map((l) => `${l.change}${l.text}`),
      ['+BCPHP-011', '-BCPHP-003'],
    );
    assert.deepEqual(
      deltas.headings.map((l) => l.text),
      ['## New section'],
    );
    assert.deepEqual(
      deltas.template.map((l) => l.text),
      ['- [ ] new box'],
    );
    assert.deepEqual(deltas.truncated, ['coding-guidelines/core/huge.md']);
  });
});
