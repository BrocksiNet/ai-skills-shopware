// Turn this repo's skills on or off for one eval workdir (SKILLS_PROFILE_CMD;
// ported from evals/runner/skills-profile.sh in plan WP10 step 3), so the
// A/B "on" and "off" runs really differ.
//
// on:  symlinks the task's skills (evals/tasks/<task>/skills, one name per
//      line; all skills when the file or the task is missing) into
//      <workdir>/.claude/skills and <workdir>/.agents/skills.
// off: removes both folders. Pair it with an agent that ignores user-level
//      skills (claude-task passes --setting-sources project, opencode-task
//      runs with a throwaway HOME), otherwise machine-wide skills leak into
//      the "off" run.
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, symlinkSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { repoSkills, taskSkills } from './eval-plan.ts';
import { referenceReads } from './reference-reads.ts';

export const PROFILE_DIRS = ['.claude/skills', '.agents/skills'] as const;

/** Markdown reference files under `<skillsDir>/<skill>/references/*.md`, keyed by `<skill>/references/<file>.md`. */
export function skillReferences(skillsDir: string, skills: string[]): Map<string, string> {
  const refs = new Map<string, string>();
  for (const skill of skills) {
    const dir = join(skillsDir, skill, 'references');
    if (!existsSync(dir)) continue;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
      refs.set(`${skill}/references/${entry.name}`, readFileSync(join(dir, entry.name), 'utf8'));
    }
  }
  return refs;
}

/** Whether a run's trace read at least one reference from `refs`, or null when unobservable / empty. */
export function observeReferenceRead(trace: string | null, refs: Map<string, string>): boolean | null {
  if (refs.size === 0 || trace === null) return null;
  const observed = referenceReads(trace, refs);
  return observed.observable ? observed.reads.length > 0 : null;
}

/** The skills a task runs with: every skill in a custom EVAL_SKILLS_ROOT
 *  package (used by discovery/transfer variant experiments), else the task's
 *  `skills` file, else every repo skill. */
export function profileSkills(root: string, task: string, skillsDir = join(root, 'skills')): string[] {
  if (resolve(skillsDir) !== resolve(root, 'skills')) {
    return readdirSync(skillsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .toSorted();
  }
  const tasksRoot = join(root, 'evals/tasks');
  if (task !== '' && existsSync(join(tasksRoot, task, 'skills'))) return taskSkills(tasksRoot, task);
  return repoSkills(root);
}

/** Applies the profile; returns an error message, or null on success. */
export function skillsProfile(
  root: string,
  mode: string,
  workdir: string,
  task: string,
  skillsDir = join(root, 'skills'),
): string | null {
  if (mode === 'off') {
    for (const dir of PROFILE_DIRS) rmSync(join(workdir, dir), { recursive: true, force: true });
    return null;
  }
  if (mode !== 'on') return 'skills-profile: mode must be on|off';
  for (const dir of PROFILE_DIRS) mkdirSync(join(workdir, dir), { recursive: true });
  const skills = profileSkills(root, task, skillsDir);
  for (const skill of skills) {
    const source = join(skillsDir, skill);
    if (skill.includes('/') || !existsSync(source) || !statSync(source).isDirectory())
      return `skills-profile: unknown skill '${skill}'`;
    for (const dir of PROFILE_DIRS) {
      const link = join(workdir, dir, skill);
      rmSync(link, { recursive: true, force: true });
      symlinkSync(source, link);
    }
  }
  return skills.length > 0 ? null : `skills-profile: no skills selected for '${task}'`;
}
