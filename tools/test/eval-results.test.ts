import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { diff, changePct } from '../src/eval-diff.ts';
import { gate } from '../src/eval-gate.ts';
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
