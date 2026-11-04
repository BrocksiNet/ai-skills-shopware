import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { transferVerdict } from '../src/grade/transfer.ts';
import { RUN, runTask } from '../src/run-task.ts';
import { summarizeTransfer } from '../src/transfer-summary.ts';
import type { TransferTrial } from '../src/transfer-trial.ts';

const tmp = mkdtempSync(join(tmpdir(), 'transfer-artifacts-'));
after(() => {
  rmSync(tmp, { recursive: true, force: true });
});

test('a broken grader is infrastructure; edited fixtures survive cleanup without skill symlinks', async () => {
  const task = join(tmp, 'evals/tasks/example');
  mkdirSync(join(task, 'fixture'), { recursive: true });
  writeFileSync(join(task, 'fixture/code.txt'), 'before');
  writeFileSync(join(task, 'instruction.md'), 'Edit code.');
  writeFileSync(join(task, 'grade.sh'), '#!/bin/bash\nexit 2\n');
  const artifacts = join(tmp, 'artifacts');
  const code = await runTask({
    root: tmp,
    task: 'example',
    mode: 'on',
    artifacts,
    env: {
      PATH: process.env.PATH,
      TMPDIR: tmp,
      EVAL_AGENT_RETRIES: '0',
      SKILLS_AGENT_CMD: 'echo after > code.txt; mkdir -p .claude; ln -s /tmp linked; echo complete',
    },
    out: () => {},
    err: () => {},
  });
  assert.equal(code, RUN.graderError);
  assert.equal(readFileSync(join(artifacts, 'workdir/code.txt'), 'utf8').trim(), 'after');
  assert.equal(existsSync(join(artifacts, 'workdir/linked')), false);
  assert.equal(existsSync(join(artifacts, 'workdir/.claude')), false);
});

test('summary separates unobservable retrieval and infrastructure from graded outcomes', () => {
  const base: TransferTrial = {
    task: 'transfer-example',
    variant: 'current',
    repeat: 1,
    status: 'pass',
    exit_code: 0,
    duration_ms: 1,
    retrieval_observable: true,
    reference_reads: [],
    required_references_read: ['sw-example/references/a.md'],
    other_references_read: [],
    loaded_skills: [],
    reported_models: ['model'],
    tokens: null,
    artifacts: 'one',
  };
  const summary = summarizeTransfer(
    [{ task: base.task, expected_references: base.required_references_read, outcome_kind: 'test' }],
    [
      base,
      { ...base, repeat: 2, status: 'fail', retrieval_observable: false },
      { ...base, repeat: 3, status: 'error' },
      { ...base, repeat: 4, status: 'skipped' },
    ],
  );
  const parsed: unknown = JSON.parse(JSON.stringify(summary));
  assert.ok(typeof parsed === 'object' && parsed !== null && 'variants' in parsed && Array.isArray(parsed.variants));
  assert.deepEqual(parsed.variants[0], {
    variant: 'current',
    planned_trials: 4,
    graded: 2,
    passed: 1,
    errors: 1,
    skipped: 1,
    capped: 0,
    cost_usd: 0,
    retrieval_observable: 1,
    any_expected_reference_read: 1,
    required_reference_hits: 1,
    required_reference_opportunities: 1,
    all_required_references_read: 1,
    other_reference_reads: 0,
    tokens_input: 0,
    tokens_output: 0,
    by_task: [{ task: base.task, passed: 1, graded: 2, required_reference_hits: 1 }],
  });
});

test('oracle startup failures and inconsistent exit codes remain infrastructure errors', () => {
  assert.throws(() => transferVerdict('', 1), /structured outcome/u);
  assert.throws(() => transferVerdict('{"outcome":"pass"}', 1), /inconsistent outcome/u);
  assert.throws(() => transferVerdict('{"outcome":"fail"}', 0), /inconsistent outcome/u);
  assert.equal(transferVerdict('{"outcome":"pass"}', 0).pass, true);
  assert.equal(transferVerdict('{"outcome":"fail","reason":"wrong code"}', 1).pass, false);
});
