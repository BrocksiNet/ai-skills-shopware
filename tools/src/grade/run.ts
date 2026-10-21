// Runs a task's grader: tools/graders/<task>.ts exports it as `grade`.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { TaskRun, Verdict } from './kit.ts';

type Json = Record<string, unknown>;
const isRecord = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);
const isVerdict = (v: unknown): v is Verdict =>
  isRecord(v) && typeof v.pass === 'boolean' && typeof v.detail === 'string';

/** The transcript text; empty when the path is unset, missing or /dev/null. */
export function readTranscript(path: string): string {
  return path !== '' && existsSync(path) ? readFileSync(path, 'utf8') : '';
}

/** The verdict of `tools/graders/<task>.ts` on one run. Throws when the
 *  task has no grader or it does not return a verdict. */
export async function gradeTask(root: string, task: string, run: TaskRun): Promise<Verdict> {
  if (!/^[a-z0-9][a-z0-9-]*$/u.test(task)) throw new Error(`bad task name: ${task}`);
  const path = join(root, 'tools/graders', `${task}.ts`);
  if (!existsSync(path)) throw new Error(`no grader tools/graders/${task}.ts`);
  const mod: unknown = await import(path);
  const grader = isRecord(mod) ? mod.grade : undefined;
  if (typeof grader !== 'function') throw new TypeError(`graders/${task}.ts does not export grade`);
  const result: unknown = Reflect.apply(grader, undefined, [run]);
  if (!isVerdict(result)) throw new TypeError(`graders/${task}.ts did not return a verdict`);
  return result;
}
