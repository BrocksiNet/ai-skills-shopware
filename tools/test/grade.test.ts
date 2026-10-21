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
} from '../src/grade/kit.ts';
import { reviewCatch, reviewIgnore } from '../src/grade/review.ts';
import { gradeTask, readTranscript } from '../src/grade/run.ts';

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

const fence = (findings: unknown[]): string => `\`\`\`json\n${JSON.stringify({ findings })}\n\`\`\`\n`;
const finding = { rule_id: 'ARCH-001', severity: 'major', file: 'src/A.php', summary: 'never reset' };

const run = (transcript: string): { workdir: string; transcript: string } => ({ workdir: tmp, transcript });
const env = (workdir: string): NodeJS.ProcessEnv => ({ PATH: process.env.PATH, WORKDIR: workdir });

describe('review graders', () => {
  const expectation = { rule: 'ARCH-001', file: 'src/**', minSeverity: 'major' as const, summary: /reset/iu };

  test('catch passes on the finding; fails without it or without a json block', () => {
    assert.equal(reviewCatch(expectation)(run(fence([finding]))).pass, true);
    assert.match(reviewCatch(expectation)(run(fence([]))).detail, /^no major\+ finding for ARCH-001/u);
    assert.match(reviewCatch(expectation)(run('')).detail, /no fenced json block/u);
  });

  test('ignore fails on a false positive', () => {
    assert.equal(reviewIgnore(expectation)(run(fence([]))).pass, true);
    assert.match(reviewIgnore(expectation)(run(fence([finding]))).detail, /^false positive: src\/A\.php/u);
  });
});

describe('gradeTask and the grade bin', () => {
  test('runs a task grader; rejects unknown and odd task names', async () => {
    const workdir = tree({ 'src/UserValidator.php': "class UserValidator { if ($name === '') {} }" });
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
      env: env(tree({ 'UserValidator.php': 'class UserValidator { x !== null; }' })),
      encoding: 'utf8',
    });
    assert.equal(pass.status, 0);
    assert.equal(pass.stdout, 'score=1 (uses_empty=0 explicit_check=1)\n');
    const failed = spawnSync('node', [bin, 'no-empty-explicit'], { env: env(tree({})), encoding: 'utf8' });
    assert.equal(failed.status, 1);
    assert.equal(failed.stdout, 'score=0 (UserValidator.php not found)\n');
    assert.equal(spawnSync('node', [bin], { env: env(tmp), encoding: 'utf8' }).status, 2);
  });
});
