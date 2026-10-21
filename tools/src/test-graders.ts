// Golden tests for the eval task graders (evals/test-graders.sh). No model
// calls.
//
// Each task with a grade.sh is graded on copies of its golden folders:
//   - fixture/         must FAIL (the pristine start state)
//   - fixtures/fail/   must FAIL (the almost-pass sneak)
//   - fixtures/pass/   must PASS (when present)
// Both negative cases run when both exist. A task may drop a
// `.skip-fixture-grade` marker when fixture/ is only the agent start dir and
// the grader may pass on it.
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { run } from './proc.ts';
import { inSeries } from './series.ts';
import { compareText } from './text.ts';

export interface TestGradersOptions {
  root: string;
  /** Task names; empty = every task with a grade.sh. */
  tasks: string[];
  env: NodeJS.ProcessEnv;
  out: (text: string) => void;
  err: (text: string) => void;
}

interface Case {
  label: string;
  expect: 'pass' | 'fail';
}

const TRANSCRIPT = '.transcript.txt';

/** The golden folders of a task, or an error when it has no negative case. */
export function graderCases(taskDir: string): { cases: Case[]; error?: string } {
  const has = (p: string): boolean => existsSync(join(taskDir, p));
  const cases: Case[] = [];
  if (has('fixture') && !has('.skip-fixture-grade')) cases.push({ label: 'fixture', expect: 'fail' });
  if (has('fixtures/fail')) cases.push({ label: 'fixtures/fail', expect: 'fail' });
  const error = cases.length === 0 ? 'no fixture/ or fixtures/fail/ for negative case' : undefined;
  if (has('fixtures/pass')) cases.push({ label: 'fixtures/pass', expect: 'pass' });
  return error === undefined ? { cases } : { cases, error };
}

const usesAst = (grader: string): boolean =>
  existsSync(grader) && readFileSync(grader, 'utf8').includes('evals/tools/ast');

/** grade.sh on a copy of `source`; the copy's transcript is the fixture's
 *  .transcript.txt or an empty file. Returns the exit code. */
async function grade(taskDir: string, source: string, env: NodeJS.ProcessEnv): Promise<number> {
  const workdir = mkdtempSync(join(tmpdir(), 'grader-'));
  try {
    cpSync(source, workdir, { recursive: true });
    const transcript = join(workdir, TRANSCRIPT);
    if (!existsSync(transcript)) writeFileSync(transcript, '');
    const r = await run('bash', [join(taskDir, 'grade.sh')], {
      env: { ...env, WORKDIR: workdir, TRANSCRIPT: transcript },
    });
    return r.status;
  } finally {
    rmSync(workdir, { recursive: true, force: true });
  }
}

/** Prints one line per case and the summary. Exit 0 = OK, 1 = failures,
 *  2 = the AST tools a grader needs are not installed. */
export async function testGraders(o: TestGradersOptions): Promise<number> {
  const tasksRoot = join(o.root, 'evals/tasks');
  const tasks =
    o.tasks.length > 0
      ? o.tasks
      : readdirSync(tasksRoot)
          .filter((t) => existsSync(join(tasksRoot, t, 'grade.sh')))
          .toSorted(compareText);
  const needsAst = tasks.some((t) => usesAst(join(tasksRoot, t, 'grade.sh')));
  if (needsAst && !existsSync(join(o.root, 'evals/tools/ast/node_modules'))) {
    o.err('test-graders: AST tools missing. Run: cd evals/tools/ast && npm ci\n');
    return 2;
  }

  let failures = 0;
  const fail = (text: string): void => {
    o.err(`  FAIL: ${text}\n`);
    failures += 1;
  };
  await inSeries(tasks, async (task) => {
    const taskDir = join(tasksRoot, task);
    if (!existsSync(join(taskDir, 'grade.sh'))) {
      fail(`${task}: missing grade.sh`);
      return;
    }
    o.out(`task: ${task}\n`);
    const { cases, error } = graderCases(taskDir);
    if (error !== undefined) fail(`${task}: ${error}`);
    await inSeries(cases, async (c) => {
      const rc = await grade(taskDir, join(taskDir, c.label), o.env);
      if ((rc === 0) === (c.expect === 'pass')) o.out(`  OK: ${task} (${c.label})\n`);
      else fail(`${task} (${c.label}): expected ${c.expect}, exit ${rc}`);
    });
    if (!cases.some((c) => c.expect === 'pass')) o.out('  skip: no fixtures/pass/\n');
  });

  if (failures > 0) {
    o.err(`\ntest-graders: ${failures} failure(s)\n`);
    return 1;
  }
  o.out('\ntest-graders: OK\n');
  return 0;
}
