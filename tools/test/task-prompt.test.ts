// The third arm of the WP11 A/B: the recorded api-facts output after the instruction.
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { taskPrompt } from '../src/run-task.ts';

function taskDir(facts?: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'task-prompt.'));
  writeFileSync(join(dir, 'instruction.md'), 'Review the diff.\n\n');
  if (facts !== undefined) writeFileSync(join(dir, 'api-facts.txt'), facts);
  return dir;
}

test('the instruction alone without EVAL_API_FACTS', () => {
  assert.equal(taskPrompt(taskDir('- X: missing\n'), {}), 'Review the diff.');
});

test('the recorded facts follow the instruction with EVAL_API_FACTS', () => {
  const prompt = taskPrompt(taskDir('- X: missing in 6.6.0.0\n'), { EVAL_API_FACTS: '1' });
  assert.match(prompt, /^Review the diff\.\n\nOutput of `api-facts`/u);
  assert.match(prompt, /```text\n- X: missing in 6\.6\.0\.0\n```$/u);
});

test('a task without recorded facts runs unchanged', () => {
  assert.equal(taskPrompt(taskDir(), { EVAL_API_FACTS: '1' }), 'Review the diff.');
});
