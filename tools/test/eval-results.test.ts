import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { diff, changePct } from '../src/eval-diff.ts';
import { gate } from '../src/eval-gate.ts';
import { type AbResult, envInt, latestPerTask, parseResults } from '../src/eval-results.ts';

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
const error = rec('task-c', { on: 0, off: 0, on_done: 0, off_done: 0, verdict: 'error', loaded_on: null, tokens_on: null });

describe('parseResults', () => {
  test('skips blank lines and records without a task', () => {
    const text = `${JSON.stringify(improved)}\n\n{"note":1}\n[1]\n${JSON.stringify(held)}\n`;
    assert.deepEqual(parseResults(text).map((r) => r.task), ['task-a', 'task-b']);
  });
  test('a line that is not JSON throws', () => {
    assert.throws(() => parseResults('{"task":"a"}\n{oops'), /line 2 is not JSON/);
  });
});

describe('latestPerTask', () => {
  test('the last line per task wins, sorted by byte order', () => {
    const out = latestPerTask([rec('b'), rec('a', { verdict: 'held' }), rec('B'), rec('a', { verdict: 'error' })]);
    assert.deepEqual(out.map((r) => `${r.task}:${r.verdict}`), ['B:improved', 'a:error', 'b:improved']);
  });
});

describe('envInt', () => {
  test('default, value and validation', () => {
    assert.equal(envInt({}, 'X', 4), 4);
    assert.equal(envInt({ X: '' }, 'X', 4), 4);
    assert.equal(envInt({ X: '7' }, 'X', 4), 7);
    assert.throws(() => envInt({ X: 'abc' }, 'X', 4), /X must be a number/);
    assert.throws(() => envInt({ X: '0' }, 'X', 4, 1), /X must be >= 1/);
    assert.throws(() => envInt({ X: '-1' }, 'X', 4, 1), /X must be >= 1/);
  });
});

describe('gate', () => {
  test('improved + held passes and shows skill-on tokens', () => {
    const r = gate([improved, held]);
    assert.equal(r.failed, false);
    assert.match(r.markdown, /\| 2\/2 \| 1200\/200 \| improved \|/);
    assert.match(r.markdown, /- Gate: \*\*PASS\*\*/);
    assert.match(r.markdown, /^fake \/ m @ abc, 2 repeat\(s\)$/m);
  });
  test('a worse task fails, named, and is the only failure', () => {
    const r = gate([held, worse], { minPassPct: 0, maxErrorPct: 25, minLoadPct: 50 });
    assert.equal(r.failed, true);
    assert.match(r.markdown, /^ {2}- `task-a`$/m);
    assert.equal(r.markdown.match(/FAIL/g)?.length, 1);
  });
  test('too many agent errors fail the gate', () => {
    const r = gate([held, error]);
    assert.equal(r.failed, true);
    assert.match(r.markdown, /agent errors/);
  });
  test('a pass rate below the gate fails', () => {
    const r = gate([rec('a', { on: 1, verdict: 'held', off: 1 }), held]);
    assert.equal(r.failed, true);
    assert.match(r.markdown, /full pass rate 50 % is below 70 %/);
  });
  test('no results fails', () => {
    const r = gate([]);
    assert.equal(r.failed, true);
    assert.match(r.markdown, /No results found/);
  });
  test('the last line per task wins', () => {
    const r = gate([improved, held, rec('task-a', { verdict: 'error' })]);
    assert.equal(r.markdown.match(/^\| `/gm)?.length, 2);
  });
  test('a model that ignores the skills fails', () => {
    const r = gate([rec('a', { loaded_on: 0 })]);
    assert.equal(r.failed, true);
    assert.match(r.markdown, /ignores the skills/);
  });
  test('a skill leak into the off run fails', () => {
    const r = gate([rec('a', { loaded_off: 1 })]);
    assert.equal(r.failed, true);
    assert.match(r.markdown, /not skill-free/);
  });
  test('an adapter without load reporting is not gated', () => {
    const r = gate([rec('a', { loaded_on: null, loaded_off: null })]);
    assert.equal(r.failed, false);
    assert.doesNotMatch(r.markdown, /loaded a task skill:/);
    assert.match(r.markdown, /\| n\/a \|/);
  });
  test('quiet tasks warn and say when the skill never loaded', () => {
    const r = gate([improved, rec('q', { off: 2, verdict: 'no_difference', loaded_on: 0 })], { minPassPct: 70, maxErrorPct: 25, minLoadPct: 0 });
    assert.match(r.markdown, /- `q` \(no_difference, skill never loaded\)/);
  });
  test('rows sort by verdict rank, then task', () => {
    const r = gate([rec('z'), rec('y', { verdict: 'held' }), rec('x', { verdict: 'error', on_done: 0, off_done: 0 })], { minPassPct: 0, maxErrorPct: 100, minLoadPct: 0 });
    assert.deepEqual([...r.markdown.matchAll(/^\| `(\w)`/gm)].map((m) => m[1]), ['x', 'y', 'z']);
  });
  test('missing header fields print null, like jq', () => {
    const { agent: _a, model: _m, sha: _s, ...bare } = improved;
    assert.match(gate([bare]).markdown, /^null \/ null @ null, 2 repeat\(s\)$/m);
  });
});

describe('diff', () => {
  test('lists the changed task', () => {
    assert.match(diff([improved], [rec('task-a', { verdict: 'error', on: 0 })]), /^\| `task-a` \| improved 2\/2 \| error 0\/2 \|$/m);
  });
  test('identical inputs report no change and no token table change', () => {
    const out = diff([improved, held], [improved, held]);
    assert.match(out, /No task changed/);
    assert.match(out, /\| 1200 \/ 200 \| 1200 \/ 200 \| 0 % \|/);
  });
  test('token change is reported per task', () => {
    const pricier = rec('task-a', { tokens_on: { input: 1340, output: 200, runs: 2 } });
    assert.match(diff([improved], [pricier]), /^\| `task-a` \| 1200 \/ 200 \| 1340 \/ 200 \| 10 % \|$/m);
  });
  test('new and removed tasks', () => {
    const out = diff([improved], [held]);
    assert.match(out, /^\| `task-a` \| improved 2\/2 \| \(removed\) \|$/m);
    assert.match(out, /^\| `task-b` \| \(new\) \| held 2\/2 \|$/m);
  });
  test('the same pass rate over a different repeat count is not a change', () => {
    assert.match(diff([improved], [rec('task-a', { repeats: 4, on: 4 })]), /No task changed/);
  });
  test('no token table without tokens on both sides', () => {
    assert.doesNotMatch(diff([improved], [rec('task-a', { tokens_on: null })]), /Tokens per skill-on run/);
  });
  test('changePct rounds half away from zero to one decimal', () => {
    assert.equal(changePct(1000, 1013), 1.3);
    assert.equal(changePct(2000, 1999), -0.1);
    assert.equal(changePct(1000, 1000.5), 0.1);
    assert.equal(changePct(1000, 999.5), -0.1);
  });
});
