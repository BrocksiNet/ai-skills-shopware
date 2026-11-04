import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';
import { diff, changePct } from '../src/eval-diff.ts';
import { gate, gateOptionsFromEnv } from '../src/eval-gate.ts';
import { type AbResult, latestPerTask, parseResults } from '../src/eval-results.ts';

const rec = (task: string, over: Partial<AbResult> = {}): AbResult => ({
  task,
  repeats: 2,
  on: 2,
  off: 1,
  on_done: 2,
  off_done: 2,
  verdict: 'improved',
  loaded_on: 2,
  loaded_off: 0,
  tokens_on: { input: 1200, output: 200, runs: 2 },
  agent: 'fake',
  model: 'm',
  sha: 'abc',
  ...over,
});

const improved = rec('task-a');
const held = rec('task-b', { off: 2, verdict: 'held' });
const worse = rec('task-a', { on: 0, off: 2, verdict: 'worse' });
const error = rec('task-c', {
  on: 0,
  off: 0,
  on_done: 0,
  off_done: 0,
  verdict: 'error',
  loaded_on: null,
  tokens_on: null,
});

const line = (over: object): string => JSON.stringify({ ...improved, ...over });

describe('parseResults', () => {
  test('skips blank lines and records without a task', () => {
    const text = `${JSON.stringify(improved)}\n\n{"note":1}\n[1]\n${JSON.stringify(held)}\n`;
    assert.deepEqual(
      parseResults(text).map((r) => r.task),
      ['task-a', 'task-b'],
    );
  });
  test('a line that is not JSON throws', () => {
    assert.throws(() => parseResults(`${JSON.stringify(improved)}\n{oops`), /line 2 is not JSON/u);
  });
  test('trial statuses agree with their run-task exit codes', () => {
    const base = { mode: 'on', repeat: 1, status: 'pass', exit_code: 0, duration_ms: 1, skills: null, tokens: null };
    for (const [status, exit_code] of [
      ['pass', 4],
      ['pass', 1],
      ['fail', 0],
      ['fail', 5],
      ['error', 0],
      ['error', 1],
      ['skipped', 0],
    ] as const)
      assert.throws(
        () => parseResults(line({ trials: [{ ...base, status, exit_code }] })),
        /trials/u,
        `${status}/${exit_code}`,
      );
    for (const [status, exit_code] of [
      ['pass', 0],
      ['fail', 1],
      ['error', 4],
      ['error', 5],
      ['skipped', 6],
    ] as const)
      assert.equal(parseResults(line({ trials: [{ ...base, status, exit_code }] })).length, 1);
  });
  test('a record with a missing or mistyped field throws', () => {
    assert.throws(() => parseResults('{"task":"a"}'), /line 1: field 'repeats' is missing or mistyped/u);
    assert.throws(() => parseResults(line({ verdict: 'better' })), /field 'verdict'/u);
    assert.throws(() => parseResults(line({ on: '2' })), /field 'on'/u);
    assert.throws(() => parseResults(line({ tokens_on: { input: 1 } })), /field 'tokens_on'/u);
    assert.equal(parseResults(line({ loaded_on: null, tokens_on: null, agent: undefined })).length, 1);
  });
});

describe('latestPerTask', () => {
  test('the last line per task wins, sorted by byte order', () => {
    const out = latestPerTask([rec('b'), rec('a', { verdict: 'held' }), rec('B'), rec('a', { verdict: 'error' })]);
    assert.deepEqual(
      out.map((r) => `${r.task}:${r.verdict}`),
      ['B:improved', 'a:error', 'b:improved'],
    );
  });
});

describe('gate', () => {
  test('improved + held passes and shows skill-on tokens', () => {
    const r = gate([improved, held]);
    assert.equal(r.failed, false);
    assert.match(r.markdown, /\| 2\/2 \| 1200\/200 \| improved \|/u);
    assert.match(r.markdown, /- Gate: \*\*PASS\*\*/u);
    assert.match(r.markdown, /^fake \/ m @ abc, 2 repeat\(s\)$/mu);
  });
  test('a worse task fails, named, and is the only failure', () => {
    const r = gate([held, worse], { minPassPct: 0, maxErrorPct: 25, minLoadPct: 50 });
    assert.equal(r.failed, true);
    assert.match(r.markdown, /^ {2}- `task-a`$/mu);
    assert.equal(r.markdown.match(/FAIL/gu)?.length, 1);
  });
  test('too many agent errors fail the gate', () => {
    const r = gate([held, error]);
    assert.equal(r.failed, true);
    assert.match(r.markdown, /agent errors/u);
  });
  test('the allowed error percentage is inclusive; exceeding it fails', () => {
    const good = ['a', 'b', 'c'].map((task) => rec(task, { verdict: 'held', off: 2 }));
    const boundary = gate([...good, error]);
    assert.equal(boundary.failed, false, boundary.markdown);
    const above = gate([good[0], good[1], error, { ...error, task: 'another-error' }].filter((r) => r !== undefined));
    assert.equal(above.failed, true);
    assert.match(above.markdown, /50 % of tasks ended in agent errors/u);
  });
  test('a pass rate below the gate fails', () => {
    const r = gate([rec('a', { on: 1, verdict: 'held', off: 1 }), held]);
    assert.equal(r.failed, true);
    assert.match(r.markdown, /full pass rate 50 % is below 70 %/u);
  });
  test('no results fails', () => {
    const r = gate([]);
    assert.equal(r.failed, true);
    assert.match(r.markdown, /No results found/u);
  });
  test('the last line per task wins', () => {
    const r = gate([improved, held, rec('task-a', { verdict: 'error' })]);
    assert.equal(r.markdown.match(/^\| `/gmu)?.length, 2);
  });
  test('a model that ignores the skills fails', () => {
    const r = gate([rec('a', { loaded_on: 0 })]);
    assert.equal(r.failed, true);
    assert.match(r.markdown, /ignores the skills/u);
  });
  test('a skill leak into the off run fails', () => {
    const r = gate([rec('a', { loaded_off: 1 })]);
    assert.equal(r.failed, true);
    assert.match(r.markdown, /not skill-free/u);
  });
  test('an adapter without load reporting is not gated', () => {
    const r = gate([rec('a', { loaded_on: null, loaded_off: null })]);
    assert.equal(r.failed, false);
    assert.doesNotMatch(r.markdown, /loaded a task skill:/u);
    assert.match(r.markdown, /\| n\/a \|/u);
  });
  test('quiet tasks warn and say when the skill never loaded', () => {
    const r = gate([improved, rec('q', { off: 2, verdict: 'no_difference', loaded_on: 0 })], {
      minPassPct: 70,
      maxErrorPct: 25,
      minLoadPct: 0,
    });
    assert.match(r.markdown, /- `q` \(no_difference, skill never loaded\)/u);
  });
  test('rows sort by verdict rank, then task', () => {
    const r = gate([rec('z'), rec('y', { verdict: 'held' }), rec('x', { verdict: 'error', on_done: 0, off_done: 0 })], {
      minPassPct: 0,
      maxErrorPct: 100,
      minLoadPct: 0,
    });
    assert.deepEqual(
      [...r.markdown.matchAll(/^\| `(\w)`/gmu)].map((m) => m[1]),
      ['x', 'y', 'z'],
    );
  });
  test('missing header fields print null, like jq', () => {
    const { agent: _a, model: _m, sha: _s, ...bare } = improved;
    assert.match(gate([bare]).markdown, /^null \/ null @ null, 2 repeat\(s\)$/mu);
  });
});

describe('diff', () => {
  test('lists the changed task', () => {
    assert.match(
      diff([improved], [rec('task-a', { verdict: 'error', on: 0 })]),
      /^\| `task-a` \| improved 2\/2 \| error 0\/2 \|$/mu,
    );
  });
  test('identical inputs report no change and no token table change', () => {
    const out = diff([improved, held], [improved, held]);
    assert.match(out, /No task changed/u);
    assert.match(out, /\| 1200 \/ 200 \| 1200 \/ 200 \| 0 % \|/u);
  });
  test('token change is reported per task', () => {
    const pricier = rec('task-a', { tokens_on: { input: 1340, output: 200, runs: 2 } });
    assert.match(diff([improved], [pricier]), /^\| `task-a` \| 1200 \/ 200 \| 1340 \/ 200 \| 10 % \|$/mu);
  });
  test('new and removed tasks', () => {
    const out = diff([improved], [held]);
    assert.match(out, /^\| `task-a` \| improved 2\/2 \| \(removed\) \|$/mu);
    assert.match(out, /^\| `task-b` \| \(new\) \| held 2\/2 \|$/mu);
  });
  test('the same pass rate over a different repeat count is not a change', () => {
    assert.match(diff([improved], [rec('task-a', { repeats: 4, on: 4 })]), /No task changed/u);
  });
  test('no token table without tokens on both sides', () => {
    assert.doesNotMatch(diff([improved], [rec('task-a', { tokens_on: null })]), /Tokens per skill-on run/u);
  });
  test('changePct rounds half away from zero to one decimal', () => {
    assert.equal(changePct(1000, 1013), 1.3);
    assert.equal(changePct(2000, 1999), -0.1);
    assert.equal(changePct(1000, 1000.5), 0.1);
    assert.equal(changePct(1000, 999.5), -0.1);
  });
});

test('gate environment options preserve defaults and accept explicit zero', () => {
  assert.deepEqual(gateOptionsFromEnv({}), { minPassPct: 70, maxErrorPct: 25, minLoadPct: 50 });
  assert.deepEqual(
    gateOptionsFromEnv({ EVAL_GATE_MIN_PASS_PCT: '0', EVAL_GATE_MAX_ERROR_PCT: '0', EVAL_GATE_MIN_LOAD_PCT: '0' }),
    { minPassPct: 0, maxErrorPct: 0, minLoadPct: 0 },
  );
  assert.deepEqual(
    gateOptionsFromEnv({ EVAL_GATE_MIN_PASS_PCT: '80', EVAL_GATE_MAX_ERROR_PCT: '10', EVAL_GATE_MIN_LOAD_PCT: '90' }),
    { minPassPct: 80, maxErrorPct: 10, minLoadPct: 90 },
  );
});

describe('gate workflow boundaries', () => {
  test('partial error runs do not inflate pass counts or skill-load rates', () => {
    const partial = { ...error, on: 1, on_done: 1, loaded_on: 1 };
    const result = gate([rec('healthy', { loaded_on: 0 }), partial], {
      minPassPct: 70,
      maxErrorPct: 50,
      minLoadPct: 0,
    });
    assert.equal(result.failed, false, result.markdown);
    assert.match(result.markdown, /full pass: \*\*1 \/ 1\*\* \(100 %/u);
    assert.match(result.markdown, /loaded a task skill: \*\*0 \/ 2\*\* \(0 %/u);
  });
  test('load rates use run counts and include the exact passing boundary', () => {
    const half = [rec('a', { loaded_on: 0 }), rec('b', { loaded_on: 2 })];
    const at = gate(half);
    assert.equal(at.failed, false, at.markdown);
    assert.match(at.markdown, /loaded a task skill: \*\*2 \/ 4\*\* \(50 %/u);
    const below = gate([half[0], rec('b', { loaded_on: 1 })].filter((r) => r !== undefined));
    assert.equal(below.failed, true);
    assert.match(below.markdown, /only 25 %/u);
    assert.doesNotMatch(below.markdown, /Gate: \*\*PASS\*\*/u);
  });
  test('the exact full-pass threshold is accepted and the report names only worse tasks', () => {
    const opts = { minPassPct: 50, maxErrorPct: 100, minLoadPct: 0 };
    const result = gate([held, rec('a', { on: 1, off: 1, verdict: 'no_difference' })], opts);
    assert.equal(result.failed, false);
    assert.match(result.markdown, /full pass: \*\*1 \/ 2\*\* \(50 %/u);
    const failed = gate([worse, held], { ...opts, minPassPct: 0 });
    const failure = failed.markdown.slice(failed.markdown.indexOf('- **FAIL**'));
    assert.match(failure, /got worse[\s\S]*`task-a`/u);
    assert.doesNotMatch(failure.split('- Warning:')[0] ?? '', /`task-b`/u);
  });
  test('an all-error result has no graded success and no NaN percentages', () => {
    const result = gate([error]);
    assert.equal(result.failed, true);
    assert.match(result.markdown, /full pass: \*\*0 \/ 0\*\* \(0 %/u);
    assert.doesNotMatch(result.markdown, /NaN|loaded a task skill:|Gate: \*\*PASS\*\*/u);
  });
  test('ranked review rows put worse and errors before successes regardless of task name', () => {
    const result = gate([
      rec('a'),
      { ...held, task: 'b' },
      rec('c', { on: 1, verdict: 'no_difference' }),
      { ...error, task: 'd' },
      { ...worse, task: 'e' },
    ]);
    assert.deepEqual(
      [...result.markdown.matchAll(/^\| `(\w)`/gmu)].map((m) => m[1]),
      ['e', 'd', 'c', 'b', 'a'],
    );
  });
  test('an improved task has no no-difference warning; a held task does', () => {
    assert.doesNotMatch(gate([improved]).markdown, /show no difference/u);
    const quiet = gate([held]).markdown;
    assert.match(quiet, /show no difference.*does not establish equivalence/u);
    assert.match(quiet, /`task-b` \(held\)/u);
    assert.doesNotMatch(quiet, /skill never loaded/u);
  });
});

// A GitHub summary is a user-facing artifact: missing tables, misplaced task
// evidence or anonymous failures must not silently pass its behavioral checks.
test('the failing GitHub summary preserves totals, evidence, gate reasons and readable Markdown', () => {
  const report = gate(
    [
      rec('a-improved'),
      rec('b-held', { off: 2, verdict: 'held', loaded_on: null, tokens_on: null }),
      rec('c-quiet', { on: 1, off: 1, verdict: 'no_difference', loaded_on: 0 }),
      { ...error, task: 'd-error' },
      rec('e-worse', { on: 0, off: 2, verdict: 'worse', loaded_on: 1, loaded_off: 1, tokens_on: null }),
    ],
    { minPassPct: 70, maxErrorPct: 10, minLoadPct: 75 },
  );
  assert.equal(report.failed, true);
  const expected = readFileSync(new URL('./golden/eval-gate-failing.txt', import.meta.url), 'utf8');
  assert.equal(report.markdown, expected.trimEnd());
});
test('an empty experiment tells CI users that no task ran', () => {
  const expected = readFileSync(new URL('./golden/eval-gate-empty.txt', import.meta.url), 'utf8');
  assert.deepEqual(gate([]), { failed: true, markdown: expected.trimEnd() });
});
test('all-provider failures do not also blame an unmeasured code pass rate', () => {
  const report = gate([error]);
  assert.equal(report.failed, true);
  assert.match(report.markdown, /agent errors/u);
  assert.doesNotMatch(report.markdown, /FAIL.*skill-on full pass rate/u);
});
