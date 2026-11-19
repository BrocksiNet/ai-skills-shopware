// changedTasks: which eval tasks the drafter's A/B runs for a change.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { changedTasks } from '../src/draft-checks.ts';
import { ROOT } from './suggest-fixture.ts';

describe('changedTasks', () => {
  test('adds the other half of a review pair', () => {
    assert.deepEqual(changedTasks(['rules/catalog.json'], ROOT, 'review-reset-interface-catch'), [
      'review-reset-interface-catch',
      'review-reset-interface-ignore',
    ]);
  });

  test('keeps a task without a pair and drops names that are no task', () => {
    assert.deepEqual(
      changedTasks(
        ['evals/tasks/review-reset-method-tag-ignore/instruction.md', 'tools/graders/review-pairs.ts'],
        ROOT,
        null,
      ),
      ['review-reset-method-tag-ignore'],
    );
  });
});
