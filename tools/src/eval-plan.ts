// Pick the eval tasks for a model run and split them into shards (plan WP1;
// ported from scripts/eval-plan.sh in WP10).
//
// A task is a folder under evals/tasks/ with a grade.sh. Selection, in order:
//   - explicit names (EVAL_TASKS), in the given order; an unknown name throws
//   - PR mode (changed files): tasks whose folder changed, whose `skills` file
//     names a changed skill, or, without a `skills` file, any changed skill
//   - otherwise all tasks
// Then the list is capped and dealt round-robin into shards; empty shards are
// dropped.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { compareText } from './eval-results.ts';

export interface PlanOptions {
  /** Explicit task names; wins over `changedFiles`. */
  tasks?: string[];
  /** Changed repo paths, one per entry (PR mode). */
  changedFiles?: string[];
  /** Cap after selection; 0 = no cap. */
  maxTasks: number;
  shards: number;
}

export interface Shard {
  id: number;
  /** Comma-separated task names, the format the workflow matrix passes on. */
  tasks: string;
}

export interface Plan {
  tasks: string[];
  count: number;
  shards: Shard[];
}

export function allTasks(tasksRoot: string): string[] {
  if (!existsSync(tasksRoot)) return [];
  return readdirSync(tasksRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(tasksRoot, d.name, 'grade.sh')))
    .map((d) => d.name)
    .sort(compareText);
}

/** Skill names in a task's `skills` file; empty when there is none. */
export function taskSkills(tasksRoot: string, task: string): string[] {
  const file = join(tasksRoot, task, 'skills');
  if (!existsSync(file)) return [];
  return readFileSync(file, 'utf8')
    .split('\n')
    .filter((l) => !l.startsWith('#') && l.trim() !== '');
}

/** Skill folders under skills/, sorted. */
export function repoSkills(root: string): string[] {
  const dir = join(root, 'skills');
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort(compareText);
}

/** The second path segment of changed files under `prefix/`, e.g. the task
 *  of `evals/tasks/<task>/grade.sh`. Files directly in `prefix/` do not count. */
function changedUnder(files: string[], prefix: string): Set<string> {
  const out = new Set<string>();
  for (const f of files) {
    if (!f.startsWith(prefix)) continue;
    const name = f.slice(prefix.length).split('/');
    if (name.length > 1 && name[0] !== '') out.add(name[0]!);
  }
  return out;
}

export function selectTasks(tasksRoot: string, opts: PlanOptions): string[] {
  if (opts.tasks !== undefined) {
    const known = new Set(allTasks(tasksRoot));
    const picked = opts.tasks.map((t) => t.replace(/\s/g, '')).filter((t) => t !== '');
    for (const t of picked) if (!known.has(t)) throw new Error(`unknown task '${t}'`);
    return picked;
  }
  const tasks = allTasks(tasksRoot);
  if (opts.changedFiles === undefined) return tasks;

  const changedTasks = changedUnder(opts.changedFiles, 'evals/tasks/');
  const changedSkills = changedUnder(opts.changedFiles, 'skills/');
  return tasks.filter((t) => {
    if (changedTasks.has(t)) return true;
    if (changedSkills.size === 0) return false;
    const skills = taskSkills(tasksRoot, t);
    return skills.length === 0 || skills.some((s) => changedSkills.has(s));
  });
}

export function plan(tasksRoot: string, opts: PlanOptions): Plan {
  let tasks = selectTasks(tasksRoot, opts);
  if (opts.maxTasks > 0 && tasks.length > opts.maxTasks) tasks = tasks.slice(0, opts.maxTasks);
  const shards: Shard[] = [];
  for (let i = 0; i < opts.shards; i++) {
    const mine = tasks.filter((_, k) => k % opts.shards === i);
    if (mine.length > 0) shards.push({ id: i + 1, tasks: mine.join(',') });
  }
  return { tasks, count: tasks.length, shards };
}
