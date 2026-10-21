import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { after, describe, test } from 'node:test';
import {
  caught,
  type Expectation,
  falsePositives,
  type Finding,
  globMatches,
  lastJsonBlock,
  parseFindings,
} from '../src/findings.ts';

const ROOT = resolve(import.meta.dirname, '../..');
const tmp = mkdtempSync(join(tmpdir(), 'findings-test-'));
after(() => {
  rmSync(tmp, { recursive: true, force: true });
});

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

const grade = (args: string[], body: string): { status: number | null; stdout: string } => {
  const file = join(tmp, `t-${Math.random().toString(36).slice(2)}.txt`);
  writeFileSync(file, body);
  return spawnSync('node', [join(ROOT, 'tools/bin/grade-findings.ts'), ...args], {
    env: { PATH: process.env.PATH, TRANSCRIPT: file },
    encoding: 'utf8',
  });
};

describe('grade-findings bin', () => {
  const catchArgs = [
    'catch',
    '--rule',
    'TEST-016',
    '--file',
    'tests/**',
    '--min-severity',
    'major',
    '--summary',
    'hook',
  ];

  test('catch passes on the finding and fails without it', () => {
    const pass = grade(catchArgs, transcript([finding({})]));
    assert.equal(pass.status, 0);
    assert.match(pass.stdout, /^score=1/u);
    const fail = grade(catchArgs, transcript([]));
    assert.equal(fail.status, 1);
    assert.match(fail.stdout, /^score=0 \(no major\+ finding for TEST-016/u);
  });

  test('ignore fails on a false positive and passes on an empty list', () => {
    const args = ['ignore', '--rule', 'TEST-016', '--summary', 'hook'];
    assert.equal(grade(args, transcript([])).status, 0);
    const fail = grade(args, transcript([finding({ severity: 'minor' })]));
    assert.equal(fail.status, 1);
    assert.match(fail.stdout, /false positive: tests\/integration\/FooTest\.php/u);
  });

  test('a transcript without findings scores 0; bad usage exits 2', () => {
    assert.equal(grade(['ignore', '--rule', 'X-001', '--summary', 'x'], '').status, 1);
    assert.equal(grade(['catch', '--rule', 'X-001'], '').status, 2);
    assert.equal(grade([...catchArgs.slice(0, 6), 'high', '--summary', 'x'], transcript([])).status, 1);
  });
});
