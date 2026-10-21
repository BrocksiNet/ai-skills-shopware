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
import { existsSync, mkdirSync, rmSync, statSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';
import { repoSkills, taskSkills } from './eval-plan.ts';

export const PROFILE_DIRS = ['.claude/skills', '.agents/skills'] as const;

/** The skills a task runs with: its `skills` file, else every repo skill. */
export function profileSkills(root: string, task: string): string[] {
  const tasksRoot = join(root, 'evals/tasks');
  if (task !== '' && existsSync(join(tasksRoot, task, 'skills'))) return taskSkills(tasksRoot, task);
  return repoSkills(root);
}

/** Applies the profile; returns an error message, or null on success. */
export function skillsProfile(root: string, mode: string, workdir: string, task: string): string | null {
  if (mode === 'off') {
    for (const dir of PROFILE_DIRS) rmSync(join(workdir, dir), { recursive: true, force: true });
    return null;
  }
  if (mode !== 'on') return 'skills-profile: mode must be on|off';
  for (const dir of PROFILE_DIRS) mkdirSync(join(workdir, dir), { recursive: true });
  const skills = profileSkills(root, task);
  for (const skill of skills) {
    const source = join(root, 'skills', skill);
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
