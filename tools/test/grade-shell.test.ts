import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { shellCommands, worktreeTarget } from '../src/grade/shell.ts';

describe('shellCommands', () => {
  test('joins continuations, drops comments and blanks, splits chains', () => {
    const script = [
      '#!/usr/bin/env bash',
      '# a comment',
      '',
      'cd /repo && git fetch origin; git worktree prune  # trailing',
      'git worktree add \\',
      '  /wt/x main',
    ].join('\n');
    assert.deepEqual(shellCommands(script), [
      'cd /repo',
      'git fetch origin',
      'git worktree prune',
      'git worktree add    /wt/x main',
    ]);
  });
});

describe('worktreeTarget', () => {
  test('the path of add, after -C, options and -b <branch>', () => {
    assert.equal(worktreeTarget('git -C /repo worktree add -b feat/x "/wt/a b" origin/trunk'), '/wt/a b');
    assert.equal(worktreeTarget('git worktree add --relative-paths --detach /wt/y'), '/wt/y');
  });
  test('the new path of move; nothing for other commands', () => {
    assert.equal(worktreeTarget('git worktree move /wt/feat-x /wt/pr-1-x'), '/wt/pr-1-x');
    assert.equal(worktreeTarget('git worktree remove /wt/x'), undefined);
    assert.equal(worktreeTarget('echo git worktree add /wt/x'), undefined);
  });
});
