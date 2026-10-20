import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, test } from 'node:test';
import { allTasks, plan, selectTasks } from '../src/eval-plan.ts';

// task-a names its skill, task-b has no skills file, task-c names another
// skill, and not-a-task has no grade.sh.
const root = mkdtempSync(join(tmpdir(), 'eval-plan-'));
const task = (name: string, skills?: string): void => {
  mkdirSync(join(root, name));
  writeFileSync(join(root, name, 'grade.sh'), '');
  if (skills !== undefined) writeFileSync(join(root, name, 'skills'), skills);
};
task('task-a', '# comment\nshopware-plugin-development\n\n');
task('task-b');
task('task-c', 'shopware-admin-js\n');
mkdirSync(join(root, 'not-a-task'));

const opts = { maxTasks: 0, shards: 4 };

describe('eval plan', () => {
  test('all tasks are folders with a grade.sh', () => {
    assert.deepEqual(allTasks(root), ['task-a', 'task-b', 'task-c']);
  });
  test('explicit tasks keep their order and lose whitespace', () => {
    const p = plan(root, { tasks: [' task-b ', 'task-a'], maxTasks: 0, shards: 2 });
    assert.deepEqual(p.tasks, ['task-b', 'task-a']);
    assert.equal(p.count, 2);
    assert.deepEqual(p.shards, [{ id: 1, tasks: 'task-b' }, { id: 2, tasks: 'task-a' }]);
  });
  test('empty shards are dropped', () => {
    assert.equal(plan(root, { tasks: ['task-a', 'task-b'], maxTasks: 0, shards: 8 }).shards.length, 2);
  });
  test('tasks are dealt round-robin', () => {
    assert.deepEqual(plan(root, { maxTasks: 0, shards: 2 }).shards, [
      { id: 1, tasks: 'task-a,task-c' },
      { id: 2, tasks: 'task-b' },
    ]);
  });
  test('max tasks caps the list', () => {
    assert.equal(plan(root, { maxTasks: 2, shards: 4 }).count, 2);
  });
  test('an unknown task is rejected', () => {
    assert.throws(() => selectTasks(root, { ...opts, tasks: ['does-not-exist'] }), /unknown task 'does-not-exist'/);
  });
  test('a changed skill selects its tasks and tasks without a skills file', () => {
    const tasks = selectTasks(root, { ...opts, changedFiles: ['skills/shopware-plugin-development/SKILL.md', 'README.md'] });
    assert.deepEqual(tasks, ['task-a', 'task-b']);
  });
  test('a changed task folder selects that task only', () => {
    const tasks = selectTasks(root, { ...opts, changedFiles: ['evals/tasks/task-c/grade.sh', 'evals/tasks/README.md'] });
    assert.deepEqual(tasks, ['task-c']);
  });
  test('a docs-only change selects nothing', () => {
    assert.equal(plan(root, { ...opts, changedFiles: ['docs/x.md'] }).count, 0);
  });
});
