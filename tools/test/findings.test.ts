import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  caught,
  type Expectation,
  falsePositives,
  type Finding,
  globMatches,
  lastJsonBlock,
  parseFindings,
} from '../src/findings.ts';

const fence = (json: string): string => `\`\`\`json\n${json}\n\`\`\`\n`;
const transcript = (findings: unknown[]): string => `Review done.\n\n${fence(JSON.stringify({ findings }, null, 2))}`;

const hook: Expectation = {
  rule: 'TEST-016',
  file: 'tests/**',
  minSeverity: 'major',
  summary: /assert\w*[^.]{0,80}\bhook/iu,
};

const finding = (over: Partial<Finding>): Finding => ({
  rule_id: null,
  severity: 'major',
  file: 'tests/integration/FooTest.php',
  summary: 'Assertions run inside the hook closure.',
  ...over,
});

describe('lastJsonBlock', () => {
  test('takes the last fenced json block', () => {
    assert.equal(lastJsonBlock(`${fence('{"a":1}')}text\n${fence('{"b":2}')}`), '{"b":2}\n');
  });

  test('ignores blocks of other languages and inline fences', () => {
    assert.equal(lastJsonBlock('```php\n{}\n```\nsee ```json {}```'), undefined);
  });
});

describe('parseFindings', () => {
  test('reads the contract shape; an empty rule_id is null', () => {
    const t = transcript([{ rule_id: '', severity: 'minor', file: 'a.php', line: 3, summary: 's', fix: 'f' }]);
    assert.deepEqual(parseFindings(t), [{ rule_id: null, severity: 'minor', file: 'a.php', summary: 's' }]);
  });

  test('an empty list is valid', () => {
    assert.deepEqual(parseFindings(transcript([])), []);
  });

  test('throws without a block, without a list, or on an unknown severity', () => {
    assert.throws(() => parseFindings('no json here'), /no fenced json block/u);
    assert.throws(() => parseFindings(fence('{"issues": []}')), /no findings list/u);
    assert.throws(() => parseFindings(transcript([{ severity: 'high', file: 'a', summary: 's' }])), /severity/u);
    assert.throws(() => parseFindings(transcript([{ severity: 'nit', file: 'a' }])), /file and summary/u);
  });
});

describe('globMatches', () => {
  test('** crosses folders, * does not', () => {
    assert.ok(globMatches('tests/**', 'tests/integration/FooTest.php'));
    assert.ok(globMatches('src/**/*.php', 'src/Foo.php'));
    assert.ok(globMatches('src/*.php', './src/Foo.php'));
    assert.ok(!globMatches('src/*.php', 'src/Sub/Foo.php'));
    assert.ok(!globMatches('tests/**', 'src/tests/FooTest.php'));
  });

  test('regex characters in the glob are literal', () => {
    assert.ok(globMatches('src/a.b(c).php', 'src/a.b(c).php'));
    assert.ok(!globMatches('src/a.b.php', 'src/aXb.php'));
  });
});

describe('caught', () => {
  test('our ID, or a summary in the reviewer’s words, at the file and severity', () => {
    assert.ok(caught([finding({ rule_id: 'TEST-016', summary: 'x' })], hook));
    assert.ok(caught([finding({})], hook));
    assert.ok(caught([finding({ rule_id: 'no-assert-in-listener' })], hook));
  });

  test('a nit, a wrong file, or a different catalog ID is not a catch', () => {
    assert.ok(!caught([finding({ rule_id: 'TEST-016', severity: 'nit' })], hook));
    assert.ok(!caught([finding({ file: 'src/Foo.php' })], hook));
    assert.ok(!caught([finding({ rule_id: 'TEST-003' })], hook));
  });

  test('an ID in also is as good as the rule', () => {
    assert.ok(caught([finding({ rule_id: 'TEST-003', summary: 'x' })], { ...hook, also: ['TEST-003'] }));
    assert.equal(
      falsePositives([finding({ rule_id: 'TEST-003', summary: 'x' })], { ...hook, also: ['TEST-003'] }).length,
      1,
    );
  });
});

describe('falsePositives', () => {
  test('a finding above nit that names the rule, anywhere', () => {
    const wrong = [finding({ rule_id: 'TEST-016', file: 'src/Foo.php', summary: 'x' }), finding({ severity: 'minor' })];
    assert.equal(falsePositives(wrong, hook).length, 2);
  });

  test('nits, other catalog rules and unrelated findings are fine', () => {
    const fine = [
      finding({ rule_id: 'TEST-016', severity: 'nit' }),
      finding({ rule_id: 'TEST-003' }),
      finding({ summary: 'The test name does not say what it checks.' }),
    ];
    assert.deepEqual(falsePositives(fine, hook), []);
  });
});
