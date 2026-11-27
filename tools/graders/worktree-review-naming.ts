// Grader: worktree-review-naming (sw-worktrees, WT-001)
// The review worktree must sit at <parent-of-main-checkout>/worktrees/<project>/
// review-<number>[-<slug>] and check out the PR head. A worktree inside the
// main checkout or in /tmp fails even with the right name.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fail, type Grader, read, verdict } from '../src/grade/kit.ts';
import { shellCommands, worktreeTarget } from '../src/grade/shell.ts';

const WANT = /^(?:\/home\/dev|~|\$HOME)\/code\/worktrees\/shopware\/review-13742(?:-[a-z0-9]+){0,5}\/?$/u;

export const grade: Grader = ({ workdir }) => {
  const file = join(workdir, 'commands.sh');
  if (!existsSync(file)) return fail('commands.sh missing');
  const commands = shellCommands(read(file));
  const targets = commands.flatMap((c) => worktreeTarget(c) ?? []);
  const placed = targets.some((t) => WANT.test(t));
  const misplaced = targets.some((t) => t.startsWith('/tmp/') || t.startsWith('/home/dev/code/shopware/'));
  const prHead = commands.some((c) => c.includes('pull/13742/head') || /\bgh pr checkout 13742\b/u.test(c));
  return verdict(placed && !misplaced && prHead, {
    worktrees: targets.length,
    placed,
    misplaced,
    pr_head: prHead,
  });
};
