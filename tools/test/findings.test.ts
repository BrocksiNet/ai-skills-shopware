import assert from 'node:assert/strict';
import { reviewNearMiss, reviewCatch } from '../src/grade/review.ts';
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

const gradingInput = (entries: unknown[]): { workdir: string; transcript: string } => ({
  workdir: '.',
  transcript: transcript(entries),
});

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
  test('a matching explanation with an accepted ID or the reviewer’s own words', () => {
    assert.ok(caught([finding({ rule_id: 'TEST-016' })], hook));
    assert.ok(caught([finding({})], hook));
    assert.ok(caught([finding({ rule_id: 'no-assert-in-listener' })], hook));
  });

  test('a nit, a wrong file, or a different catalog ID is not a catch', () => {
    assert.ok(!caught([finding({ rule_id: 'TEST-016', severity: 'nit' })], hook));
    assert.ok(!caught([finding({ file: 'src/Foo.php' })], hook));
    assert.ok(!caught([finding({ rule_id: 'TEST-003' })], hook));
  });

  test('an ID in also is as good as the rule', () => {
    assert.ok(caught([finding({ rule_id: 'TEST-003' })], { ...hook, also: ['TEST-003'] }));
    assert.equal(falsePositives([finding({ rule_id: 'TEST-003' })], { ...hook, also: ['TEST-003'] }).length, 1);
  });
});

describe('falsePositives', () => {
  test('a finding above nit that names the rule, anywhere', () => {
    const wrong = [finding({ rule_id: 'TEST-016', file: 'src/Foo.php', summary: 'x' }), finding({ severity: 'minor' })];
    assert.equal(falsePositives(wrong, hook).length, 2);
  });

  test('only nits and explicitly allowed findings are fine', () => {
    const fine = [finding({ rule_id: 'TEST-016', severity: 'nit' })];
    assert.deepEqual(falsePositives(fine, hook), []);
  });
});

describe('review grading adversarial claims', () => {
  test('a correct ID cannot replace an explanation of the defect', () => {
    assert.equal(caught([finding({ rule_id: 'TEST-016', summary: 'Rename this variable.' })], hook), false);
    assert.equal(caught([finding({ rule_id: 'TEST-016-extra' })], hook), false);
  });
  test('a clean task rejects unrelated major findings and wrong citations', () => {
    assert.equal(falsePositives([finding({ rule_id: 'TEST-003' })], hook).length, 1);
    assert.equal(falsePositives([finding({ summary: 'Rename this variable.' })], hook).length, 1);
    assert.equal(falsePositives([finding({})], { ...hook, allowed: [hook] }).length, 0);
    assert.equal(falsePositives([finding({ file: 'src/Foo.php' })], { ...hook, allowed: [hook] }).length, 1);
  });
});

describe('review input boundaries and task outcomes', () => {
  test('malformed roots and individual findings give contract diagnostics', () => {
    for (const value of [null, [], false, 4, { findings: 'none' }])
      assert.throws(() => parseFindings(fence(JSON.stringify(value))), /no findings list/u);
    for (const value of [null, [], false, 4, 'finding'])
      assert.throws(() => parseFindings(transcript([value])), /findings\[0\] is not an object/u);
    for (const fields of [{ file: null }, { summary: 4 }, { file: 'a', summary: undefined }])
      assert.throws(() => parseFindings(transcript([{ ...finding({}), ...fields }])), /file and summary strings/u);
  });
  test('unknown rule_id types are rejected at the transcript boundary', () => {
    for (const rule_id of [1, false, {}, []])
      assert.throws(() => parseFindings(transcript([{ ...finding({}), rule_id }])), /rule_id/u);
  });
  test('single-character globs and literal punctuation do not overmatch files', () => {
    assert.equal(globMatches('src/Foo?.php', 'src/Foo1.php'), true);
    assert.equal(globMatches('src/Foo?.php', 'src/Foo12.php'), false);
    assert.equal(globMatches('src/Foo?.php', 'src/Foo/.php'), false);
    assert.equal(globMatches('src/a+b[1].php', 'src/a+b[1].php'), true);
    assert.equal(globMatches('src/a+b[1].php', 'src/aaab1.php'), false);
  });
  test('a near-miss needs the right problem, file, severity and attribution together', () => {
    const grade = reviewNearMiss({ ...hook, rule: 'SF-013', accept: ['TEST-016'] });
    const run = (entries: unknown[]): boolean => grade({ workdir: '.', transcript: transcript(entries) }).pass;
    for (const rule_id of [null, 'TEST-016', 'listener-assertions']) assert.equal(run([finding({ rule_id })]), true);
    for (const fields of [
      { file: 'src/Other.php' },
      { severity: 'minor' as const },
      { summary: 'Rename a variable.' },
      { rule_id: 'SEC-001' },
    ])
      assert.equal(run([finding(fields)]), false, JSON.stringify(fields));
    assert.equal(
      run([finding({}), finding({ rule_id: 'SF-013' })]),
      false,
      'a decoy citation cannot be hidden by a correct report',
    );
    assert.equal(run([finding({}), finding({ rule_id: 'SF-013', severity: 'nit' })]), true);
  });
  test('catch outcomes reject extra substantive claims but retain allowed genuine issues', () => {
    const target = finding({ rule_id: 'TEST-016' });
    const other = finding({ file: 'src/Other.php', summary: 'Wrong call.' });
    const grade = reviewCatch(hook);
    assert.equal(grade(gradingInput([target])).pass, true);
    assert.equal(grade(gradingInput([target, other])).pass, false);
    assert.equal(grade(gradingInput([target, { ...other, severity: 'nit' }])).pass, true);
    const allowed = { ...hook, file: 'src/Other.php', summary: /Wrong call/u };
    assert.equal(reviewCatch({ ...hook, allowed: [allowed] })(gradingInput([target, other])).pass, true);
  });
});

test('citation-required tasks reject uncited explanations but accept documented aliases', () => {
  const cited = { ...hook, requireCitation: true, also: ['TEST-003'] };
  for (const rule_id of [null, 'listener-assertions', 'TEST-999'])
    assert.equal(reviewCatch(cited)(gradingInput([finding({ rule_id })])).pass, false);
  for (const rule_id of ['TEST-016', 'TEST-003'])
    assert.equal(reviewCatch(cited)(gradingInput([finding({ rule_id })])).pass, true);
  assert.equal(reviewCatch({ ...hook, requireCitation: false })(gradingInput([finding({})])).pass, true);
});
test('JSON fences must open and close on their own lines', () => {
  for (const text of ['prefix ```json\n{}\n```\n', '```json\n{} ```\n', '```json\n{}\n``` trailing\n'])
    assert.equal(lastJsonBlock(text), undefined);
});
test('recursive globs match deep folders as well as the folder root', () => {
  assert.equal(globMatches('src/**/*.php', 'src/Foo.php'), true);
  assert.equal(globMatches('src/**/*.php', 'src/a/b/Foo.php'), true);
  assert.equal(globMatches('src/**/*.php', 'src/a/b/Foo.js'), false);
});

test('omitting an optional rule ID normalizes to the same uncited finding as null', () => {
  const { rule_id: _rule, ...uncited } = finding({});
  assert.deepEqual(parseFindings(transcript([uncited])), [finding({ rule_id: null })]);
});
test('a single-character file glob handles a Unicode code point', () => {
  assert.equal(globMatches('src/?.php', 'src/😀.php'), true);
  assert.equal(globMatches('src/?.php', 'src/😀x.php'), false);
});
test('non-catalog project references are permitted without treating embedded IDs as our catalog', () => {
  for (const rule_id of ['project-style: RFC-123', 'ADR-2'])
    assert.equal(caught([finding({ rule_id })], hook), true, rule_id);
});
test('severity diagnostics separate the permitted choices for correction', () => {
  assert.throws(
    () => parseFindings(transcript([{ severity: 'high', file: 'a.php', summary: 's' }])),
    /severity must be one of nit, minor, major, blocking/u,
  );
});

test('file matching ignores only the leading dot-slash and keeps literal path segments', () => {
  assert.equal(globMatches('src/./Service.php', 'src/./Service.php'), true);
  assert.equal(globMatches('src/DomainService.php', 'src/Domain./Service.php'), false);
});
