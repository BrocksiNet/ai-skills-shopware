// Runs a task's grader: tools/graders/<task>.ts exports it as `grade`, or a
// review pair's entry in tools/graders/review-pairs.ts grades it.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PAIRS } from '../../graders/review-pairs.ts';
import type { Grader, TaskRun, Verdict } from './kit.ts';
import { reviewCatch, reviewIgnore } from './review.ts';

type Json = Record<string, unknown>;
const isRecord = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);
const isVerdict = (v: unknown): v is Verdict =>
  isRecord(v) && typeof v.pass === 'boolean' && typeof v.detail === 'string';

/** The transcript text; empty when the path is unset, missing or /dev/null. */
export function readTranscript(path: string): string {
  return path !== '' && existsSync(path) ? readFileSync(path, 'utf8') : '';
}

/** The grader of a `review-<topic>-catch` or `-ignore` task in review-pairs.ts. */
export function pairGrader(task: string): Grader | undefined {
  const match = /^review-(.+)-(catch|ignore)$/u.exec(task);
  const pair = match?.[1] === undefined ? undefined : PAIRS[match[1]];
  if (pair === undefined) return undefined;
  const { ignore, ...expectation } = pair;
  return match?.[2] === 'catch'
    ? reviewCatch(expectation)
    : reviewIgnore(ignore ?? { rule: pair.rule, summary: pair.summary });
}

/** The verdict of `tools/graders/<task>.ts`, or the task's review pair, on
 *  one run. Throws when the task has no grader or it does not return a verdict. */
export async function gradeTask(root: string, task: string, run: TaskRun): Promise<Verdict> {
  if (!/^[a-z0-9][a-z0-9-]*$/u.test(task)) throw new Error(`bad task name: ${task}`);
  const path = join(root, 'tools/graders', `${task}.ts`);
  if (!existsSync(path)) {
    const pair = pairGrader(task);
    if (pair !== undefined) return pair(run);
    throw new Error(`no grader tools/graders/${task}.ts and no review pair`);
  }
  const mod: unknown = await import(path);
  const grader = isRecord(mod) ? mod.grade : undefined;
  if (typeof grader !== 'function') throw new TypeError(`graders/${task}.ts does not export grade`);
  const result: unknown = Reflect.apply(grader, undefined, [run]);
  if (!isVerdict(result)) throw new TypeError(`graders/${task}.ts did not return a verdict`);
  return result;
}
