import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { after, describe, test } from 'node:test';
import {
  countLines,
  fail,
  filesUnder,
  findFile,
  flat,
  hasLine,
  jsCallArgs,
  phpMethod,
  stripComments,
  verdict,
  type Verdict,
} from '../src/grade/kit.ts';
import { gradeTask, pairGrader, readTranscript } from '../src/grade/run.ts';

const ROOT = resolve(import.meta.dirname, '../..');
const tmp = mkdtempSync(join(tmpdir(), 'grade-test-'));
after(() => {
  rmSync(tmp, { recursive: true, force: true });
});

function tree(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmp, 'w-'));
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(join(dir, path, '..'), { recursive: true });
    writeFileSync(join(dir, path), text);
  }
  return dir;
}

describe('kit', () => {
  test('verdict lists flags, booleans as 1 and 0', () => {
    assert.deepEqual(verdict(true, { a: true, b: false, n: 2 }), { pass: true, detail: 'a=1 b=0 n=2' });
    assert.deepEqual(fail('x not found'), { pass: false, detail: 'x not found' });
  });

  test('hasLine and countLines match per line, like grep', () => {
    assert.ok(hasLine('a\nfoo(\nb', /^foo\(/u));
    assert.ok(!hasLine('foo\n(', /foo\s*\(/u));
    assert.equal(countLines('x\ny\nx', /x/u), 2);
  });

  test('findFile takes the first sorted file with the extension and text; skips node_modules', () => {
    const dir = tree({
      'node_modules/a/Foo.php': 'Foo',
      'src/b/Foo.php': 'class Foo',
      'src/a/Foo.php': 'class Foo',
      'src/Foo.txt': 'Foo',
    });
    assert.equal(findFile(dir, 'Foo'), join(dir, 'src/a/Foo.php'));
    assert.equal(findFile(dir, /^class Foo$/u, '.php'), join(dir, 'src/a/Foo.php'));
    assert.equal(findFile(dir, 'Bar'), undefined);
    assert.equal(filesUnder(dir).length, 3);
  });

  test('stripComments drops comments but keeps attributes and URLs', () => {
    const php = '#[Package(\'x\')]\n/* a */ $a = 1; // b\n$u = "https://x"; {# t #}<!-- h -->';
    assert.equal(stripComments(php), '#[Package(\'x\')]\n $a = 1; \n$u = "https://x"; ');
    assert.equal(flat('a\nb'), 'a b');
  });

  test('phpMethod returns the method body only', () => {
    const php = 'class A {\n  public function a(): void\n  {\n    if (x) { y(); }\n  }\n  public function b() {}\n}\n';
    assert.equal(phpMethod(php, 'a'), '  public function a(): void\n  {\n    if (x) { y(); }\n  }\n');
    assert.equal(phpMethod(php, 'c'), '');
  });

  test('jsCallArgs returns the balanced argument list of the first call', () => {
    assert.equal(jsCallArgs('// fetch(no)\nfetch(url, { a: f(1) }); fetch(2)', 'fetch'), 'url, { a: f(1) }');
    assert.equal(jsCallArgs('fetch(unclosed', 'fetch'), '');
  });
});

const env = (workdir: string): NodeJS.ProcessEnv => ({ PATH: process.env.PATH, WORKDIR: workdir });

/** A findings block with one major finding citing `rule`. */
const finding = (rule: string): string =>
  '```json\n' +
  JSON.stringify({
    findings: [
      {
        rule_id: rule,
        severity: 'major',
        file: 'src/Resources/app/administration/src/x.js',
        summary: 'grants system_config:read',
      },
    ],
  }) +
  '\n```\n';

describe('gradeTask and the grade bin', () => {
  test('a review pair grades both tasks from review-pairs.ts; other names get no pair', async () => {
    const workdir = mkdtempSync(join(tmpdir(), 'pair-'));
    const run = (task: string, transcript: string): Promise<Verdict> => gradeTask(ROOT, task, { workdir, transcript });
    assert.equal((await run('review-acl-system-config-catch', finding('ADM-043'))).pass, true);
    assert.equal((await run('review-acl-system-config-catch', finding('ADM-001'))).pass, false);
    assert.equal((await run('review-acl-system-config-ignore', finding('ADM-043'))).pass, false);
    assert.equal((await run('review-acl-system-config-ignore', '```json\n{"findings": []}\n```\n')).pass, true);
    assert.equal(pairGrader('review-acl-system-config-near-miss'), undefined);
    assert.equal(pairGrader('review-no-such-topic-catch'), undefined);
    assert.equal(pairGrader('no-empty-explicit'), undefined);
  });

  test('runs a task grader; rejects unknown and odd task names', async () => {
    const workdir = tree({
      'src/CustomerEmailValidator.php':
        'class CustomerEmailValidator { public function __construct(private array $blockedDomains) {} }',
    });
    assert.equal((await gradeTask(ROOT, 'no-empty-explicit', { workdir, transcript: '' })).pass, true);
    await assert.rejects(gradeTask(ROOT, 'no-such-task', { workdir, transcript: '' }), /no grader/u);
    await assert.rejects(gradeTask(ROOT, '../x', { workdir, transcript: '' }), /bad task name/u);
  });

  test('readTranscript is empty for an unset or missing path', () => {
    assert.equal(readTranscript(''), '');
    assert.equal(readTranscript(join(tmp, 'missing.txt')), '');
  });

  test('prints the score and exits 0, 1, or 2 on bad usage', () => {
    const bin = join(ROOT, 'tools/bin/grade.ts');
    const pass = spawnSync('node', [bin, 'no-empty-explicit'], {
      env: env(tree({ 'CustomerEmailValidator.php': 'class CustomerEmailValidator { $blockedDomains !== []; }' })),
      encoding: 'utf8',
    });
    assert.equal(pass.status, 0);
    assert.equal(pass.stdout, 'score=1 (uses_empty=0 blocklist=1)\n');
    const failed = spawnSync('node', [bin, 'no-empty-explicit'], { env: env(tree({})), encoding: 'utf8' });
    assert.equal(failed.status, 1);
    assert.equal(failed.stdout, 'score=0 (CustomerEmailValidator.php not found)\n');
    assert.equal(spawnSync('node', [bin], { env: env(tmp), encoding: 'utf8' }).status, 2);
  });
});
