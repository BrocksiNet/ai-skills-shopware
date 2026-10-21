// Grades one eval task: runs tools/graders/<task>.ts on $WORKDIR and
// $TRANSCRIPT. The task's grade.sh is a wrapper for this file, so Harbor,
// the smoke harness and the runner keep calling grade.sh.
//
//   WORKDIR=... TRANSCRIPT=... node tools/bin/grade.ts <task>
//
// Prints `score=1 (detail)` or `score=0 (detail)`. Exit 0 = pass, 1 = fail,
// 2 = usage or a broken grader.
import { resolve } from 'node:path';
import { stderr, stdout } from '../src/cli.ts';
import { envOr } from '../src/env.ts';
import { errorMessage } from '../src/errors.ts';
import { gradeTask, readTranscript } from '../src/grade/run.ts';

async function main(): Promise<number> {
  const [task, ...rest] = process.argv.slice(2);
  const workdir = envOr(process.env, 'WORKDIR', '');
  if (task === undefined || rest.length > 0 || workdir === '') {
    stderr('usage: WORKDIR=<dir> [TRANSCRIPT=<file>] grade.ts <task>\n');
    return 2;
  }
  try {
    const root = resolve(import.meta.dirname, '../..');
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
