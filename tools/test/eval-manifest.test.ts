import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { gate } from '../src/eval-gate.ts';
import { manifestErrors, parseManifest } from '../src/eval-manifest.ts';
import { manifest } from '../src/eval-experiment.ts';
import type { AbResult, AbTrial } from '../src/eval-results.ts';

const expected = manifest(
  ['task-a', 'task-b'],
  1,
  { EVAL_EXPERIMENT_ID: 'run-1', EVAL_AGENT: 'fake', TASK_MODEL: 'm' },
  'abc',
);
const trials: AbTrial[] = ['on', 'off'].map((mode) => ({
  mode: mode === 'on' ? 'on' : 'off',
  repeat: 1,
  status: 'pass',
  exit_code: 0,
  duration_ms: 1,
  skills: null,
  tokens: null,
}));
const record = (task: string, over: Partial<AbResult> = {}): AbResult => ({
  task,
  repeats: 1,
  on: 1,
  off: 1,
  on_done: 1,
  off_done: 1,
  verdict: 'held',
  agent: 'fake',
  model: 'm',
  sha: 'abc',
  experiment_id: 'run-1',
  trials,
  ...over,
});

describe('experiment manifest', () => {
  test('validates the frozen plan', () => {
    assert.deepEqual(parseManifest(JSON.stringify(expected)), expected);
    for (const fields of [{ tasks: [] }, { tasks: ['task-a', 'task-a'] }, { tasks: ['../x'] }, { repeats: 0 }]) {
      assert.throws(() => parseManifest(JSON.stringify({ ...expected, ...fields })), /invalid eval manifest/u);
    }
  });
  test('a passing subset fails the gate', () => {
    const partial = gate([record('task-a')], undefined, expected);
    assert.equal(partial.failed, true);
    assert.match(partial.markdown, /missing task: task-b/u);
    assert.equal(gate([record('task-a'), record('task-b')], undefined, expected).failed, false);
  });
  test('rejects mixed experiments, model profiles and duplicate results before deduplication', () => {
    const bad = manifestErrors(
      [record('task-a', { experiment_id: 'other', model: 'other' }), record('task-a')],
      expected,
    );
    assert.ok(bad.some((e) => e.includes('experiment_id')));
    assert.ok(bad.some((e) => e.includes('model')));
    assert.ok(bad.some((e) => e.includes('duplicate task')));
  });
  test('a runtime failure cannot masquerade as a passing or failed graded trial', () => {
    for (const [status, exit_code] of [
      ['pass', 4],
      ['fail', 2],
      ['error', 0],
      ['skipped', 1],
    ] as const) {
      const bad = record('task-a', { trials: trials.map((t) => (t.mode === 'on' ? { ...t, status, exit_code } : t)) });
      assert.equal(gate([bad, record('task-b')], undefined, expected).failed, true, `${status}/${exit_code}`);
    }
  });
  test('checks trial completeness and aggregate consistency', () => {
    for (const fields of [
      { trials: [] },
      { trials: [trials[0], trials[0]].filter((t) => t !== undefined) },
      { on: 0 },
    ]) {
      assert.ok(manifestErrors([record('task-a', fields), record('task-b')], expected).length > 0);
    }
  });
});

describe('manifest evidence boundaries', () => {
  test('each identity field is checked independently, including commit and repeat count', () => {
    for (const fields of [{ agent: 'other' }, { model: 'other' }, { sha: 'other' }, { repeats: 2 }]) {
      const key = Object.keys(fields)[0];
      assert.deepEqual(manifestErrors([record('task-a', fields), record('task-b')], expected), [
        `task-a: ${key} does not match the manifest`,
      ]);
    }
  });
  test('unexpected tasks are rejected even when every planned task is present', () => {
    assert.deepEqual(manifestErrors([record('task-a'), record('task-b'), record('extra')], expected), [
      'unexpected task: extra',
    ]);
  });
  test('off-arm pass and completion counts are checked independently', () => {
    for (const fields of [{ off: 0 }, { off_done: 0 }])
      assert.deepEqual(manifestErrors([record('task-a', fields), record('task-b')], expected), [
        'task-a: off counts disagree with the trial records',
      ]);
  });
  test('duplicate repeat numbers cannot replace distinct runs', () => {
    const plan = { ...expected, tasks: ['task-a'], repeats: 2 };
    const entries = trials.flatMap((t) => [
      { ...t, repeat: 1 },
      { ...t, repeat: t.mode === 'on' ? 1 : 2 },
    ]);
    assert.deepEqual(
      manifestErrors([record('task-a', { repeats: 2, on: 2, off: 2, on_done: 2, off_done: 2, trials: entries })], plan),
      ['task-a: incomplete or duplicate on trials'],
    );
  });
});

describe('manifest input and outcome contracts', () => {
  test('malformed metadata is rejected without accepting partial objects', () => {
    const invalid: unknown[] = [
      null,
      [],
      false,
      5,
      'manifest',
      {},
      ...[
        { version: 2 },
        { id: '' },
        { id: 7 },
        { tasks: 'task-a' },
        { tasks: [1] },
        { tasks: ['task-a', 1] },
        { tasks: ['task_a'] },
        { repeats: -1 },
        { repeats: 1.5 },
        { repeats: '1' },
        { agent: 3 },
        { model: null },
        { sha: false },
      ].map((fields) => Object.assign({}, expected, fields)),
      ...Object.keys(expected).map((key) =>
        Object.fromEntries(Object.entries(expected).filter(([name]) => name !== key)),
      ),
    ];
    for (const value of invalid)
      assert.throws(() => parseManifest(JSON.stringify(value)), /invalid eval manifest/u, JSON.stringify(value));
  });
  test('all trial statuses contribute to the right aggregates', () => {
    const plan = { ...expected, tasks: ['task-a'], repeats: 4 };
    const outcomes = [
      ['pass', 0],
      ['fail', 1],
      ['error', 4],
      ['skipped', 6],
    ] as const;
    const entries = trials.flatMap((t) =>
      outcomes.map(([status, exit_code], i) => Object.assign({}, t, { repeat: i + 1, status, exit_code })),
    );
    const result = record('task-a', { repeats: 4, on: 1, off: 1, on_done: 2, off_done: 2, trials: entries });
    assert.deepEqual(manifestErrors([result], plan), []);
    for (const fields of [{ on: 4 }, { off: 4 }, { on_done: 4 }, { off_done: 4 }, { on_done: 1 }, { off_done: 1 }])
      assert.ok(manifestErrors([{ ...result, ...fields }], plan).some((e) => e.includes('counts disagree')));
  });
  test('out-of-range repeat IDs are not complete evidence', () => {
    for (const repeat of [0, 2]) {
      const result = record('task-a', { trials: trials.map((t) => (t.mode === 'on' ? { ...t, repeat } : t)) });
      assert.deepEqual(manifestErrors([result, record('task-b')], expected), [
        'task-a: incomplete or duplicate on trials',
      ]);
    }
  });
});

test('missing per-trial evidence returns an actionable manifest error', () => {
  const { trials: _trials, ...withoutTrials } = record('task-a');
  assert.deepEqual(manifestErrors([withoutTrials, record('task-b')], expected), ['task-a: missing trial records']);
});
test('one valid repeat ID does not hide another outside the planned range', () => {
  const plan = { ...expected, tasks: ['task-a'], repeats: 2 };
  const entries = trials.flatMap((t) => [
    { ...t, repeat: t.mode === 'on' ? 0 : 1 },
    { ...t, repeat: 2 },
  ]);
  assert.deepEqual(
    manifestErrors([record('task-a', { repeats: 2, on: 2, off: 2, on_done: 2, off_done: 2, trials: entries })], plan),
    ['task-a: incomplete or duplicate on trials'],
  );
});

test('a complete summary identifies the frozen experiment and its task coverage', () => {
  const report = gate([record('task-a'), record('task-b')], undefined, expected);
  assert.equal(report.failed, false);
  assert.match(report.markdown, /- Experiment `run-1`: 2\/2 planned tasks reported\./u);
  assert.doesNotMatch(report.markdown, /no experiment manifest/u);
});

test('trial status disagreements retain the task and mode in the diagnostic', () => {
  const inconsistent = record('task-a', { trials: trials.map((t) => (t.mode === 'on' ? { ...t, exit_code: 4 } : t)) });
  assert.deepEqual(manifestErrors([inconsistent, record('task-b')], expected), [
    'task-a: on trial status disagrees with exit_code',
  ]);
});
test('an empty evidence list is diagnosed as missing trial records', () => {
  assert.deepEqual(manifestErrors([record('task-a', { trials: [] }), record('task-b')], expected), [
    'task-a: missing trial records',
  ]);
});
test('repeating an on-run while dropping an off-run identifies both broken arms', () => {
  const plan = { ...expected, tasks: ['task-a'], repeats: 2 };
  const entries: AbTrial[] = [
    { ...trials[0], mode: 'on', repeat: 1, status: 'pass', exit_code: 0, duration_ms: 1, skills: null, tokens: null },
    { ...trials[0], mode: 'on', repeat: 2, status: 'pass', exit_code: 0, duration_ms: 1, skills: null, tokens: null },
    { ...trials[0], mode: 'on', repeat: 1, status: 'pass', exit_code: 0, duration_ms: 1, skills: null, tokens: null },
    { ...trials[0], mode: 'off', repeat: 1, status: 'pass', exit_code: 0, duration_ms: 1, skills: null, tokens: null },
  ];
  assert.deepEqual(
    manifestErrors([record('task-a', { repeats: 2, on: 3, on_done: 3, off: 1, off_done: 1, trials: entries })], plan),
    ['task-a: incomplete or duplicate on trials', 'task-a: incomplete or duplicate off trials'],
  );
});
