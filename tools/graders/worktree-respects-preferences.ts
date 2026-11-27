// Grader: worktree-respects-preferences (sw-worktrees, WT-003)
// prefs/sw-worktrees/preferences.md sets worktree_root /srv/wt, layout flat and
// the alias swp for shopware-private, so the worktree is
// /srv/wt/swp--issue-4711[-<slug>], on a new branch from trunk, without
// --relative-paths. The shared default location fails.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fail, type Grader, read, verdict } from '../src/grade/kit.ts';
import { shellCommands, worktreeTarget } from '../src/grade/shell.ts';

const WANT = /^\/srv\/wt\/swp--issue-4711(?:-[a-z0-9]+){0,5}\/?$/u;

export const grade: Grader = ({ workdir }) => {
  const file = join(workdir, 'commands.sh');
  if (!existsSync(file)) return fail('commands.sh missing');
  const adds = shellCommands(read(file)).filter((c) => worktreeTarget(c) !== undefined);
  const add = adds.find((c) => WANT.test(worktreeTarget(c) ?? ''));
  const placed = add !== undefined;
  const newBranch = add !== undefined && /\s-[bB]\s/u.test(add) && /\btrunk\b/u.test(add);
  const relative = adds.some((c) => c.includes('--relative-paths'));
  return verdict(placed && newBranch && !relative, {
    worktrees: adds.length,
    placed,
    new_branch_from_trunk: newBranch,
    relative_paths: relative,
  });
};
