// Eval tasks: a folder under evals/tasks/ with an instruction.md. Every task
// is graded by `node tools/bin/grade.ts <task>` with WORKDIR and TRANSCRIPT
// set. That runs tools/graders/<task>.ts, the task's entry in
// tools/graders/review-pairs.ts, or the task's own grade.sh, which only the
// AST-backed tasks keep.
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { compareText } from './text.ts';

/** True when `tasksRoot/<task>` is an eval task. */
export const isTask = (tasksRoot: string, task: string): boolean => existsSync(join(tasksRoot, task, 'instruction.md'));

/** Every task under `tasksRoot`, sorted. */
export const listTasks = (tasksRoot: string): string[] =>
  existsSync(tasksRoot)
    ? readdirSync(tasksRoot)
        .filter((t) => isTask(tasksRoot, t))
        .toSorted(compareText)
    : [];

/** The task's own grade.sh, when it has one instead of a TypeScript grader. */
export function ownGradeSh(tasksRoot: string, task: string): string | undefined {
  const path = join(tasksRoot, task, 'grade.sh');
  return existsSync(path) ? path : undefined;
}

/** The command that grades `task` (run it with WORKDIR and TRANSCRIPT set):
 *  the task's own grade.sh, else tools/bin/grade.ts. */
export function gradeCommand(root: string, task: string): { cmd: string; args: string[] } {
  const own = ownGradeSh(join(root, 'evals/tasks'), task);
  return own === undefined
    ? { cmd: process.execPath, args: [join(root, 'tools/bin/grade.ts'), task] }
    : { cmd: 'bash', args: [own] };
}
