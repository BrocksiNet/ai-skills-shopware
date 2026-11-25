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

/** In-process TS grader: passes when the workdir has `done.txt` and transcript contains "ok" (or is empty). */
const TS_GRADER = [
  "import { existsSync } from 'node:fs';",
  "import { join } from 'node:path';",
  'export const grade = ({ workdir, transcript }) => ({',
  "  pass: existsSync(join(workdir, 'done.txt')) && (transcript === '' || transcript.includes('ok')),",
  "  detail: '',",
  '});',
  '',
].join('\n');

let n = 0;
function repo(files: Record<string, string>): string {
  const root = join(tmp, `repo-${++n}`);
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  return root;
}

async function grade(
  root: string,
  tasks: string[] = [],
  opts: { concurrency?: number; env?: NodeJS.ProcessEnv } = {},
): Promise<{ rc: number; out: string; err: string }> {
  let out = '';
  let err = '';
  const rc = await testGraders({
    root,
    tasks,
    env: { PATH: process.env.PATH, ...opts.env },
    out: (t) => {
      out += t;
    },
    err: (t) => {
      err += t;
    },
    ...(opts.concurrency === undefined ? {} : { concurrency: opts.concurrency }),
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
  test('every task; its own grade.sh or in-process TS grader; the transcript comes from the fixture', async () => {
    const root = repo({
      'tools/graders/ts.ts': TS_GRADER,
      'evals/tasks/good/instruction.md': '',
      'evals/tasks/good/grade.sh': GRADER,
      'evals/tasks/good/fixture/start.txt': '',
      'evals/tasks/good/fixtures/fail/done.txt': '',
      'evals/tasks/good/fixtures/pass/done.txt': '',
      'evals/tasks/good/fixtures/pass/.transcript.txt': 'ok\n',
      'evals/tasks/ts/instruction.md': '',
      'evals/tasks/ts/fixture/x': '',
      'evals/tasks/ts/fixtures/fail/done.txt': '',
      'evals/tasks/ts/fixtures/fail/.transcript.txt': 'nope\n',
      'evals/tasks/ts/fixtures/pass/done.txt': '',
      'evals/tasks/ts/fixtures/pass/.transcript.txt': 'ok\n',
      'evals/tasks/not-a-task/fixture/x': '',
    });
    const r = await grade(root, [], { concurrency: 2 });
    assert.equal(r.rc, 0, r.err);
    assert.equal(
      r.out,
      [
        'task: good',
        '  OK: good (fixture)',
        '  OK: good (fixtures/fail)',
        '  OK: good (fixtures/pass)',
        'task: ts',
        '  OK: ts (fixture)',
        '  OK: ts (fixtures/fail)',
        '  OK: ts (fixtures/pass)',
        '',
        'test-graders: OK',
        '',
      ].join('\n'),
    );
  });
  test('a throwing in-process TS grader is reported as exit 2 on both negative and positive cases', async () => {
    const root = repo({
      'tools/graders/boom.ts': "export const grade = () => { throw new Error('broken grader'); };\n",
      'evals/tasks/boom/instruction.md': '',
      'evals/tasks/boom/fixture/x': '',
      'evals/tasks/boom/fixtures/pass/x': '',
    });
    const r = await grade(root);
    assert.equal(r.rc, 1);
    assert.equal(
      r.err,
      [
        '  FAIL: boom (fixture): expected fail, exit 2',
        '  FAIL: boom (fixtures/pass): expected pass, exit 2',
        '',
        'test-graders: 2 failure(s)',
        '',
      ].join('\n'),
    );
  });
  test('wrong results, a missing negative case and a missing grader fail', async () => {
    const root = repo({
      'evals/tasks/leaky/instruction.md': '',
      'evals/tasks/leaky/grade.sh': 'exit 0\n',
      'evals/tasks/leaky/fixture/x': '',
      'evals/tasks/only-pass/instruction.md': '',
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
        '  FAIL: ghost: not a task (no instruction.md)',
        '',
        'test-graders: 4 failure(s)',
        '',
      ].join('\n'),
    );
  });
  test('an AST grader without its tools installed is exit 2', async () => {
    const root = repo({
      'evals/tasks/ast/instruction.md': '',
      'evals/tasks/ast/grade.sh': 'node evals/tools/ast/run.mjs\n',
    });
    const r = await grade(root);
    assert.deepEqual([r.rc, r.err], [2, 'test-graders: AST tools missing. Run: cd evals/tools/ast && npm ci\n']);
  });
  test('invalid concurrency returns exit 2', async () => {
    const root = repo({});
    const r = await grade(root, [], { env: { TEST_GRADERS_CONCURRENCY: '0' } });
    assert.equal(r.rc, 2);
    assert.match(r.err, /TEST_GRADERS_CONCURRENCY must be >= 1/u);
  });
});
