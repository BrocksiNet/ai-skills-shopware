import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { lintRuleLines } from '../src/lint-config.ts';
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
  test('watched AGENTS prose is mined even without a bullet; fenced examples and moves are not', () => {
    const patch = [
      '@@ -110,6 +110,11 @@',
      ' ## Snippets & Translations',
      '+Pluralized snippets use two forms when zero has the plural wording.',
      '+Use a third form only for distinct zero wording.',
      '+',
      '+```json',
      '+"example": "one | many"',
      '+```',
      '-Moved guidance.',
      '+Moved guidance.',
    ].join('\n');
    const deltas = commitDeltas(
      {
        sha: '8e4dcd7662f7e418ad0b0abc1dbb3cadc71f202a',
        title: 'docs(agents): document the two-form rule for pluralized snippets (#21858)',
        date: '2026-10-22T00:00:00Z',
        files: [file('AGENTS.md', patch), file('unwatched/AGENTS.md', '+Unrelated local guidance.')],
      },
      'shopware-trunk',
      ['AGENTS.md'],
    );
    assert.deepEqual(deltas.guidance, [
      { file: 'AGENTS.md', change: '+', text: 'Pluralized snippets use two forms when zero has the plural wording.' },
      { file: 'AGENTS.md', change: '+', text: 'Use a third form only for distinct zero wording.' },
    ]);
    assert.deepEqual(deltas.bullets, []);
    assert.deepEqual(deltas.headings, []);
  });

  test('an unavailable watched AGENTS patch is reported, never treated as no guidance change', () => {
    const deltas = commitDeltas(
      {
        sha: 'x',
        title: 't',
        date: 'd',
        files: [file('src/Administration/Resources/app/administration/AGENTS.md'), file('unwatched/AGENTS.md')],
      },
      'shopware-trunk',
      ['src/Administration/Resources/app/administration/AGENTS.md'],
    );
    assert.deepEqual(deltas.truncated, ['src/Administration/Resources/app/administration/AGENTS.md']);
  });

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
        file('.agents/skills/sw-review/references/COST.md', '+- not a review rule'),
        file('coding-guidelines/core/unit-tests.md', '+## New section\n+- a bullet'),
        file('.github/PULL_REQUEST_TEMPLATE.md', '+- [ ] new box\n+'),
        file('coding-guidelines/core/huge.md'),
        file('src/Core/Checkout/Cart.php', '+# not a heading'),
      ],
    });
    assert.deepEqual(
      deltas.bullets.map((l) => l.text),
      ['Use the clock', 'persona bullet'],
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

const texts = (lines: { change: string; text: string }[]): string[] => lines.map((l) => `${l.change}${l.text}`);

describe('lint rule settings', () => {
  const ADMIN = 'src/Administration/Resources/app/administration/eslint.config.ts';

  test('ESLint and Stylelint levels on one line; a changed level is a removal and an addition', () => {
    const patch = [
      '@@ -170,4 +170,4 @@',
      "     'sw-core-rules/require-package-annotation': ['error'],",
      "-    'sw-core-rules/no-tc-translation': 'error',",
      "+    'sw-core-rules/no-tc-translation': 'off',",
      "+    quotes: ['warn', 'single'],",
      "+    'no-console': ['error', { allow: ['warn'] }],",
      "+    'import/no-useless-path-segments': 0,",
      '+    "scss/at-rule-no-unknown": [true, {',
      "+    files: ['src/**/*.ts'],",
      "+    'max-lines': 500,",
    ].join('\n');
    assert.deepEqual(texts(lintRuleLines(ADMIN, patch)), [
      '-sw-core-rules/no-tc-translation: error',
      '+sw-core-rules/no-tc-translation: off',
      '+quotes: warn',
      '+no-console: error',
      '+import/no-useless-path-segments: 0',
      '+scss/at-rule-no-unknown: true',
    ]);
  });

  test('a level on the line after the rule counts, whichever of the two lines changed', () => {
    const added = [
      '@@ -829,2 +829,6 @@',
      '+        rules: {',
      "+            'filename-rules/not-match': [",
      "+                'error',",
      '+                /\\.js$/,',
      '+            ],',
    ].join('\n');
    assert.deepEqual(texts(lintRuleLines(ADMIN, added)), ['+filename-rules/not-match: error']);
    const level = [
      '@@ -637,3 +637,3 @@',
      "             'sw-deprecation-rules/no-deprecated-components': [",
      "-                'error',",
      "+                'warn',",
      '                 {',
    ].join('\n');
    assert.deepEqual(texts(lintRuleLines(ADMIN, level)), [
      '-sw-deprecation-rules/no-deprecated-components: error',
      '+sw-deprecation-rules/no-deprecated-components: warn',
    ]);
    const untouched = [
      '@@ -1,3 +1,3 @@',
      "             'a/b': [",
      "                 'error',",
      '-                { x: 1 },',
      '+                { x: 2 },',
    ].join('\n');
    assert.deepEqual(lintRuleLines(ADMIN, untouched), []);
  });

  test('a moved setting cancels out; ludtwig rules are the quoted names', () => {
    const moved = ['@@ -1,3 +1,3 @@', "-    'no-var': 'error',", '     other,', "+    'no-var': 'error',"].join('\n');
    assert.deepEqual(lintRuleLines(ADMIN, moved), []);
    const toml = [
      '@@ -2,3 +2,3 @@',
      '-    "twig-logic-or",',
      '+    "twig-block-duplicate",',
      '+indentation-count = 4',
    ].join('\n');
    assert.deepEqual(texts(lintRuleLines('src/Storefront/Resources/views/ludtwig-config.toml', toml)), [
      '-twig-logic-or',
      '+twig-block-duplicate',
    ]);
  });

  test('commit deltas read lint configs and Markdown watched by exact path; the template stays a template', () => {
    const paths = [ADMIN, 'adr/2026-06-17-shared.md', '.github/PULL_REQUEST_TEMPLATE.md', 'coding-guidelines'];
    const deltas = commitDeltas(
      {
        sha: 'x',
        title: 't',
        date: 'd',
        files: [
          file(ADMIN, "+    'no-var': 'error',"),
          file('src/Storefront/Resources/app/storefront/eslint.config.js', "+    'no-var': 'error',"),
          file('adr/2026-06-17-shared.md', '+Agents read the same file as humans.'),
          file('adr/2026-01-01-other.md', '+Not watched.'),
          file('.github/PULL_REQUEST_TEMPLATE.md', '+- [ ] new box'),
          file('coding-guidelines/core/x.md', '+Prose under a watched folder is no heading.'),
        ],
      },
      'shopware-trunk',
      paths,
    );
    assert.deepEqual(texts(deltas.lintRules ?? []), ['+no-var: error']);
    assert.deepEqual(texts(deltas.guidance ?? []), ['+Agents read the same file as humans.']);
    assert.deepEqual(texts(deltas.template), ['+- [ ] new box']);
    assert.deepEqual(deltas.headings, []);
  });
});
