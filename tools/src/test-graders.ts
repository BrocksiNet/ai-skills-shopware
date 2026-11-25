// Golden tests for the eval task graders (evals/test-graders.sh). No model
// calls.
//
// Each task is graded in-process with gradeTask (or via bash on its own
// grade.sh for AST-backed tasks) on copies of its golden folders:
//   - fixture/         must FAIL (the pristine start state)
//   - fixtures/fail/   must FAIL (the almost-pass sneak)
//   - fixtures/pass/   must PASS (when present)
// Both negative cases run when both exist. A task may drop a
// `.skip-fixture-grade` marker when fixture/ is only the agent start dir and
// the grader may pass on it.
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { availableParallelism, tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { envInt } from './env.ts';
import { errorMessage } from './errors.ts';
import { gradeTask, readTranscript } from './grade/run.ts';
import { run } from './proc.ts';
import { inPool, inSeries } from './series.ts';
import { isTask, listTasks, ownGradeSh } from './tasks.ts';

export interface TestGradersOptions {
  root: string;
  /** Task names; empty = every task. */
  tasks: string[];
  env: NodeJS.ProcessEnv;
  out: (text: string) => void;
  err: (text: string) => void;
  /** Max tasks graded concurrently; defaults to min(availableParallelism(), 8) or TEST_GRADERS_CONCURRENCY. */
  concurrency?: number;
}

interface Case {
  label: string;
  expect: 'pass' | 'fail';
}

interface TaskReport {
  out: string[];
  err: string[];
  failures: number;
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

const usesAst = (tasksRoot: string, task: string): boolean => {
  const own = ownGradeSh(tasksRoot, task);
  return own !== undefined && readFileSync(own, 'utf8').includes('evals/tools/ast');
};

/** Grades a copy of `source` in-process (TS graders / review pairs) or via
 *  bash (tasks with their own grade.sh). The copy's transcript is the
 *  fixture's .transcript.txt or an empty file. Returns the exit code. */
async function grade(root: string, task: string, source: string, env: NodeJS.ProcessEnv): Promise<number> {
  const workdir = mkdtempSync(join(tmpdir(), 'grader-'));
  try {
    cpSync(source, workdir, { recursive: true });
    const transcriptPath = join(workdir, TRANSCRIPT);
    if (!existsSync(transcriptPath)) writeFileSync(transcriptPath, '');
    const own = ownGradeSh(join(root, 'evals/tasks'), task);
    if (own !== undefined) {
      const r = await run('bash', [own], {
        env: { ...env, WORKDIR: workdir, TRANSCRIPT: transcriptPath },
      });
      return r.status;
    }
    try {
      const verdict = await gradeTask(root, task, {
        workdir: resolve(workdir),
        transcript: readTranscript(transcriptPath),
      });
      return verdict.pass ? 0 : 1;
    } catch {
      return 2;
    }
  } finally {
    rmSync(workdir, { recursive: true, force: true });
  }
}

function resolveConcurrency(o: TestGradersOptions): number {
  if (o.concurrency !== undefined) {
    if (!Number.isSafeInteger(o.concurrency) || o.concurrency < 1) {
      throw new Error('concurrency must be >= 1');
    }
    return o.concurrency;
  }
  const fallback = Math.max(1, Math.min(availableParallelism(), 8));
  return envInt(o.env, 'TEST_GRADERS_CONCURRENCY', fallback, 1);
}

async function runTaskCases(o: TestGradersOptions, tasksRoot: string, task: string): Promise<TaskReport> {
  const out: string[] = [];
  const err: string[] = [];
  let failures = 0;
  const fail = (text: string): void => {
    err.push(`  FAIL: ${text}\n`);
    failures += 1;
  };
  const taskDir = join(tasksRoot, task);
  if (!isTask(tasksRoot, task)) {
    fail(`${task}: not a task (no instruction.md)`);
    return { out, err, failures };
  }
  out.push(`task: ${task}\n`);
  const { cases, error } = graderCases(taskDir);
  if (error !== undefined) fail(`${task}: ${error}`);
  await inSeries(cases, async (c) => {
    const rc = await grade(o.root, task, join(taskDir, c.label), o.env);
    const expectedRc = c.expect === 'pass' ? 0 : 1;
    if (rc === expectedRc) out.push(`  OK: ${task} (${c.label})\n`);
    else fail(`${task} (${c.label}): expected ${c.expect}, exit ${rc}`);
  });
  if (!cases.some((c) => c.expect === 'pass')) out.push('  skip: no fixtures/pass/\n');
  return { out, err, failures };
}

/** Prints one line per case and the summary. Exit 0 = OK, 1 = failures,
 *  2 = the AST tools a grader needs are not installed or bad concurrency. */
export async function testGraders(o: TestGradersOptions): Promise<number> {
  let concurrency: number;
  try {
    concurrency = resolveConcurrency(o);
  } catch (error) {
    o.err(`test-graders: ${errorMessage(error)}\n`);
    return 2;
  }
  const tasksRoot = join(o.root, 'evals/tasks');
  const tasks = o.tasks.length > 0 ? o.tasks : listTasks(tasksRoot);
  const needsAst = tasks.some((t) => usesAst(tasksRoot, t));
  if (needsAst && !existsSync(join(o.root, 'evals/tools/ast/node_modules'))) {
    o.err('test-graders: AST tools missing. Run: cd evals/tools/ast && npm ci\n');
    return 2;
  }

  const reports = await inPool(tasks, concurrency, (task) => runTaskCases(o, tasksRoot, task));
  let failures = 0;
  for (const report of reports) {
    for (const line of report.out) o.out(line);
    for (const line of report.err) o.err(line);
    failures += report.failures;
  }

  if (failures > 0) {
    o.err(`\ntest-graders: ${failures} failure(s)\n`);
    return 1;
  }
  o.out('\ntest-graders: OK\n');
  return 0;
}
