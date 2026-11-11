// Grades one eval task on $WORKDIR and $TRANSCRIPT: tools/graders/<task>.ts,
// the task's review pair, or the task's own grade.sh when it keeps one (the
// AST graders). Harbor, the smoke harness, the runner and test-graders all
// call this file; tasks no longer carry a grade.sh wrapper for it.
//
//   WORKDIR=... TRANSCRIPT=... node tools/bin/grade.ts <task>
//
// Prints `score=1 (detail)` or `score=0 (detail)`. Exit 0 = pass, 1 = fail,
// 2 = usage or a broken grader.
import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { stderr, stdout } from '../src/cli.ts';
import { envOr } from '../src/env.ts';
import { errorMessage } from '../src/errors.ts';
import { gradeTask, readTranscript } from '../src/grade/run.ts';
import { ownGradeSh } from '../src/tasks.ts';

async function main(): Promise<number> {
  const [task, ...rest] = process.argv.slice(2);
  const workdir = envOr(process.env, 'WORKDIR', '');
  if (task === undefined || rest.length > 0 || workdir === '') {
    stderr('usage: WORKDIR=<dir> [TRANSCRIPT=<file>] grade.ts <task>\n');
    return 2;
  }
  const root = resolve(import.meta.dirname, '../..');
  const own = ownGradeSh(join(root, 'evals/tasks'), task);
  if (own !== undefined) {
    if (process.env.GRADE_OWN_SH === '1') {
      stderr(`grade: ${task}/grade.sh calls grade.ts again; it must grade on its own\n`);
      return 2;
    }
    const r = spawnSync('bash', [own], { stdio: 'inherit', env: { ...process.env, GRADE_OWN_SH: '1' } });
    return r.status ?? 2;
  }
  try {
    const transcript = readTranscript(envOr(process.env, 'TRANSCRIPT', ''));
    const v = await gradeTask(root, task, { workdir: resolve(workdir), transcript });
    stdout(`score=${v.pass ? 1 : 0}${v.detail === '' ? '' : ` (${v.detail})`}\n`);
    return v.pass ? 0 : 1;
  } catch (error) {
    stderr(`grade: ${errorMessage(error)}\n`);
    return 2;
  }
}

process.exitCode = await main();
