import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, describe, test } from 'node:test';
import { graderCases, testGraders } from '../src/test-graders.ts';

const tmp = mkdtempSync(join(tmpdir(), 'test-graders-test-'));
after(() => {
  rmSync(tmp, { recursive: true, force: true });
});

/** Passes when the workdir has `done.txt` and the transcript says "ok". */
const GRADER = '#!/usr/bin/env bash\n[ -f "$WORKDIR/done.txt" ] && grep -q ok "$TRANSCRIPT"\n';

let n = 0;
function repo(files: Record<string, string>): string {
  const root = join(tmp, `repo-${++n}`);
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  return root;
}

async function grade(root: string, tasks: string[] = []): Promise<{ rc: number; out: string; err: string }> {
  let out = '';
  let err = '';
  const rc = await testGraders({
    root,
    tasks,
    env: { PATH: process.env.PATH },
    out: (t) => {
      out += t;
    },
    err: (t) => {
      err += t;
    },
  });
  return { rc, out, err };
}

describe('grader cases', () => {
  test('negative cases first, the skip marker, and no negative case', () => {
    const root = repo({
      'a/fixture/x': '',
      'a/fixtures/fail/x': '',
      'a/fixtures/pass/x': '',
      'b/fixture/x': '',
      'b/.skip-fixture-grade': '',
      'b/fixtures/pass/x': '',
    });
    assert.deepEqual(
      graderCases(join(root, 'a')).cases.map((c) => `${c.label} ${c.expect}`),
      ['fixture fail', 'fixtures/fail fail', 'fixtures/pass pass'],
    );
    assert.deepEqual(graderCases(join(root, 'b')), {
      cases: [{ label: 'fixtures/pass', expect: 'pass' }],
      error: 'no fixture/ or fixtures/fail/ for negative case',
    });
  });
});

describe('testGraders', () => {
  test('every task with a grade.sh; the transcript comes from the fixture', async () => {
    const root = repo({
      'evals/tasks/good/grade.sh': GRADER,
      'evals/tasks/good/fixture/start.txt': '',
      'evals/tasks/good/fixtures/fail/done.txt': '',
      'evals/tasks/good/fixtures/pass/done.txt': '',
      'evals/tasks/good/fixtures/pass/.transcript.txt': 'ok\n',
      'evals/tasks/no-grader/fixture/x': '',
    });
    const r = await grade(root);
    assert.equal(r.rc, 0, r.err);
    assert.equal(
      r.out,
      'task: good\n  OK: good (fixture)\n  OK: good (fixtures/fail)\n  OK: good (fixtures/pass)\n\ntest-graders: OK\n',
    );
  });
  test('wrong results, a missing negative case and a missing grader fail', async () => {
    const root = repo({
      'evals/tasks/leaky/grade.sh': 'exit 0\n',
      'evals/tasks/leaky/fixture/x': '',
      'evals/tasks/only-pass/grade.sh': 'exit 1\n',
      'evals/tasks/only-pass/fixtures/pass/x': '',
    });
    const r = await grade(root, ['leaky', 'only-pass', 'ghost']);
    assert.equal(r.rc, 1);
    assert.match(r.out, /task: leaky\n {2}skip: no fixtures\/pass\/\n/u);
    assert.equal(
      r.err,
      [
        '  FAIL: leaky (fixture): expected fail, exit 0',
        '  FAIL: only-pass: no fixture/ or fixtures/fail/ for negative case',
        '  FAIL: only-pass (fixtures/pass): expected pass, exit 1',
        '  FAIL: ghost: missing grade.sh',
        '',
        'test-graders: 4 failure(s)',
        '',
      ].join('\n'),
    );
  });
  test('an AST grader without its tools installed is exit 2', async () => {
    const root = repo({ 'evals/tasks/ast/grade.sh': 'node evals/tools/ast/run.mjs\n' });
    const r = await grade(root);
    assert.deepEqual([r.rc, r.err], [2, 'test-graders: AST tools missing. Run: cd evals/tools/ast && npm ci\n']);
  });
});
