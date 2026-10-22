import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, test } from 'node:test';
import {
  type Decision,
  type ModeCounts,
  abRecord,
  abSummary,
  agentLabel,
  decide,
  emptyCounts,
  loadedOneOf,
  sumUsage,
  tokensAverage,
} from '../src/ab.ts';
import { runModes } from '../src/ab-run.ts';
import { RUN, errorReason, runTask } from '../src/run-task.ts';

const ROOT = resolve(import.meta.dirname, '../..');
const RUNNER = join(ROOT, 'evals/runner');
// Bash-only graders. TASK_A has a `skills` file, TASK_B has none (all skills).
const TASK_A = 'dal-search-without-limit';
const TASK_B = 'no-empty-explicit';

const counts = (over: Partial<ModeCounts>): ModeCounts => ({ ...emptyCounts(), ...over });

const v = (repeats: number, on: Partial<ModeCounts>, off: Partial<ModeCounts>, min = 50): string => {
  const d = decide(repeats, counts(on), counts(off), min);
  return `${d.verdict} ${d.code}`;
};

describe('verdicts', () => {
  test('every verdict and its exit code', () => {
    assert.equal(v(2, { pass: 2 }, { pass: 0 }), 'improved 0');
    assert.equal(v(2, { pass: 2 }, { pass: 2 }), 'held 11');
    assert.equal(v(2, { pass: 0 }, { pass: 0 }), 'no_difference 10');
    assert.equal(v(2, { pass: 0 }, { pass: 2 }), 'worse 20');
    assert.equal(v(2, { err: 2 }, { err: 2 }), 'error 5');
  });
  test('a one-run gap with 3 repeats is noise, not worse', () => {
    assert.equal(v(3, { pass: 2 }, { pass: 3 }), 'no_difference 10');
  });
  test('one agent error still gives a verdict on the completed runs', () => {
    const d = decide(3, counts({ pass: 2, err: 1 }), counts({ pass: 0 }), 50);
    assert.deepEqual([d.verdict, d.onDone, d.offDone], ['improved', 2, 3]);
  });
  test('fewer than half the runs of a mode completed is an error', () => {
    assert.equal(v(3, { pass: 1, err: 2 }, { pass: 0 }), 'error 5');
  });
  test('min delta 0 counts an equal rate as improved, like ab.sh', () => {
    assert.equal(v(1, { pass: 0 }, { pass: 0 }, 0), 'improved 0');
  });
});

describe('tokens and loads', () => {
  test('usage lines are summed like awk', () => {
    assert.deepEqual(sumUsage('100 20\n300 40\n\n'), [400, 60]);
    assert.deepEqual(sumUsage('7 3.9\nabc 2x\n'), [7, 5]);
  });
  test('averages round half up, null without reports', () => {
    assert.deepEqual(tokensAverage(counts({ tokensIn: 3, tokensOut: 5, tokenRuns: 2 })), {
      input: 2,
      output: 3,
      runs: 2,
    });
    assert.equal(tokensAverage(emptyCounts()), null);
  });
  test('a load counts only on an exact line', () => {
    assert.equal(loadedOneOf('sw-testing\n', ['sw-testing']), true);
    assert.equal(loadedOneOf('shopware-testing-x\n', ['sw-testing']), false);
    assert.equal(loadedOneOf('', []), false);
  });
});

describe('record and summary', () => {
  test('agent label', () => {
    assert.equal(agentLabel({ SKILLS_AGENT_CMD: '/x/opencode-task.sh --model m' }), 'opencode');
    assert.equal(agentLabel({ SKILLS_AGENT_CMD: '/x/fake-agent.sh' }), 'fake-agent');
    assert.equal(agentLabel({ EVAL_AGENT: 'claude-task', SKILLS_AGENT_CMD: '/x/y.sh' }), 'claude');
  });
  test('fields keep the ab.sh order', () => {
    const on = counts({ pass: 2, loaded: 2, reported: 2, tokensIn: 2400, tokensOut: 400, tokenRuns: 2 });
    const off = counts({});
    const r = abRecord('t', 2, on, off, decide(2, on, off, 50), { agent: 'a', model: 'm', sha: 's', ts: 'x' });
    assert.equal(
      JSON.stringify(r),
      '{"task":"t","repeats":2,"on":2,"off":0,"on_done":2,"off_done":2,"errors":0,"delta":2,"verdict":"improved","loaded_on":2,"loaded_off":null,"tokens_on":{"input":1200,"output":200,"runs":2},"tokens_off":null,"agent":"a","model":"m","sha":"s","ts":"x"}',
    );
    assert.match(
      abSummary(r, on, off),
      /skill loaded: on 2\/2, off null\/2\n {2}tokens per run \(input\/output\): on 1200\/200, off n\/a\n {2}=> skill IMPROVES/u,
    );
  });
  test('error reason is the last three stderr lines', () => {
    assert.equal(errorReason('a\nb\nc\nd\n'), 'b c d');
    assert.equal(errorReason(''), '');
  });
});

// End to end with evals/runner/fake-agent.sh: no model calls.
const tmp = mkdtempSync(join(tmpdir(), 'ab-test-'));
const baseEnv = (over: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv => ({
  PATH: process.env.PATH,
  HOME: process.env.HOME,
  TMPDIR: tmp,
  SKILLS_AGENT_CMD: join(RUNNER, 'fake-agent.sh'),
  SKILLS_PROFILE_CMD: join(RUNNER, 'skills-profile.sh'),
  EVAL_AGENT_RETRIES: '0',
  EVAL_AGENT_RETRY_WAIT: '0',
  ...over,
});
const run = async (
  task: string,
  mode: 'on' | 'off',
  over: NodeJS.ProcessEnv,
): Promise<{ rc: number; out: string; err: string }> => {
  let out = '';
  let err = '';
  const rc = await runTask({
    root: ROOT,
    task,
    mode,
    env: baseEnv(over),
    out: (t) => {
      out += t;
    },
    err: (t) => {
      err += t;
    },
    sleep: async () => {},
  });
  return { rc, out, err };
};

describe('runTask with the fake agent', () => {
  test('graded pass, graded fail, agent error, no agent', async () => {
    assert.equal((await run(TASK_A, 'on', { FAKE_AGENT_MODE: 'always-pass' })).rc, RUN.pass);
    assert.equal((await run(TASK_A, 'on', { FAKE_AGENT_MODE: 'always-fail' })).rc, RUN.fail);
    assert.equal((await run(TASK_A, 'on', { FAKE_AGENT_MODE: 'error' })).rc, RUN.agentError);
    const none = await run(TASK_A, 'on', { SKILLS_AGENT_CMD: '' });
    assert.equal(none.rc, RUN.noAgent);
    assert.match(none.out, /----- task: dal-search-without-limit \(mode=on\) -----/u);
  });
  test('profile off really removes the skills', async () => {
    assert.equal((await run(TASK_A, 'off', { FAKE_AGENT_MODE: 'skill-helps' })).rc, RUN.fail);
  });
  test('an unknown task is a usage error', async () => {
    assert.equal((await run('does-not-exist', 'on', {})).rc, RUN.usage);
    assert.equal((await run('../tasks', 'on', {})).rc, RUN.usage);
  });
  test('an agent error is retried on a fresh workdir, dropping its tokens', async () => {
    const usage = join(tmp, 'retry.usage');
    const r = await run(TASK_A, 'on', {
      EVAL_AGENT_RETRIES: '1',
      FAKE_AGENT_MODE: 'always-pass',
      FAKE_AGENT_ERROR_ONCE: join(tmp, 'once-1'),
      EVAL_USAGE_LOG: usage,
    });
    assert.equal(r.rc, RUN.pass);
    assert.match(r.err, /attempt 1\): fake-agent: simulated one-off API error; retrying in 0s/u);
    assert.equal(readFileSync(usage, 'utf8').trim().split('\n').length, 1);
  });
  test('a persistent agent error names the reason', async () => {
    const r = await run(TASK_A, 'on', { EVAL_AGENT_RETRIES: '1', FAKE_AGENT_MODE: 'error' });
    assert.equal(r.rc, RUN.agentError);
    assert.match(r.err, /exit 4, attempt 2\): fake-agent: simulated API error; not graded/u);
  });
  test('a hung agent times out as an agent error', async () => {
    const r = await run(TASK_A, 'on', { SKILLS_AGENT_CMD: '(sleep 20 &); sleep 20', EVAL_AGENT_TIMEOUT_SECONDS: '1' });
    assert.equal(r.rc, RUN.agentError);
    assert.match(r.err, /timed out after 1s; not graded/u);
  });
  test('a background child holding stdout does not block grading', async () => {
    const started = Date.now();
    const r = await run(TASK_A, 'on', { SKILLS_AGENT_CMD: '(sleep 20 &); echo finished' });
    assert.equal(r.rc, RUN.fail);
    assert.ok(Date.now() - started < 10_000);
    assert.match(r.out, /^finished\n/u);
  });
  test('legacy profile hooks see the workdir', async () => {
    const r = await run(TASK_A, 'on', {
      SKILLS_PROFILE_CMD: '',
      SKILLS_PROFILE_ON_CMD: 'mkdir -p "$WORKDIR/.claude/skills/x"',
      FAKE_AGENT_MODE: 'skill-helps',
    });
    assert.equal(r.rc, RUN.pass);
  });
  test('a failing profile is a usage error', async () => {
    assert.equal((await run(TASK_A, 'on', { SKILLS_PROFILE_CMD: '/bin/false' })).rc, RUN.usage);
  });
});

interface ModesRun {
  on: ModeCounts;
  off: ModeCounts;
  err: string;
  d: Decision;
}

async function modes(task: string, repeats: number, over: NodeJS.ProcessEnv): Promise<ModesRun> {
  let err = '';
  const c = await runModes({
    root: ROOT,
    task,
    repeats,
    env: baseEnv(over),
    err: (t) => {
      err += t;
    },
    sleep: async () => {},
  });
  return { ...c, err, d: decide(repeats, c.on, c.off, 50) };
}

describe('runModes with the fake agent', () => {
  test('skill-helps: improved, loads and tokens per mode', async () => {
    const r = await modes(TASK_A, 2, { FAKE_AGENT_MODE: 'skill-helps' });
    assert.equal(r.d.verdict, 'improved');
    assert.deepEqual([r.on.pass, r.off.pass, r.on.loaded, r.off.loaded], [2, 0, 2, 0]);
    assert.deepEqual(
      [tokensAverage(r.on), tokensAverage(r.off)],
      [
        { input: 1200, output: 200, runs: 2 },
        { input: 1000, output: 100, runs: 2 },
      ],
    );
  });
  test('skill-hurts is worse, errors are an error without tokens', async () => {
    assert.equal((await modes(TASK_A, 2, { FAKE_AGENT_MODE: 'skill-hurts' })).d.verdict, 'worse');
    const e = await modes(TASK_A, 2, { FAKE_AGENT_MODE: 'error' });
    assert.equal(e.d.verdict, 'error');
    assert.equal(e.on.err + e.off.err, 4);
    assert.deepEqual([tokensAverage(e.on), tokensAverage(e.off)], [null, null]);
    assert.equal(e.err.match(/----- agent error/gu)?.length, 4);
  });
  test('a task without a skills file counts a load of any repo skill', async () => {
    const r = await modes(TASK_B, 1, { FAKE_AGENT_MODE: 'always-pass' });
    assert.equal(r.d.verdict, 'held');
    assert.equal(r.on.loaded, 1);
  });
  test('tokens count completed runs only', async () => {
    const r = await modes(TASK_A, 3, { FAKE_AGENT_MODE: 'skill-helps', FAKE_AGENT_ERROR_ONCE: join(tmp, 'once-2') });
    assert.deepEqual([r.d.verdict, r.d.onDone, r.on.tokenRuns], ['improved', 2, 2]);
  });
  test('skill loads: ignored, leaked, not reported', async () => {
    const none = await modes(TASK_A, 1, { FAKE_AGENT_MODE: 'always-pass', FAKE_AGENT_LOAD: 'none' });
    assert.deepEqual([none.on.reported, none.on.loaded], [1, 0]);
    const leak = await modes(TASK_A, 1, { FAKE_AGENT_MODE: 'always-pass', FAKE_AGENT_LOAD: 'leak' });
    assert.equal(leak.off.loaded, 1);
    const unsupported = await modes(TASK_A, 1, {
      FAKE_AGENT_MODE: 'always-pass',
      FAKE_AGENT_LOAD: 'unsupported',
      FAKE_AGENT_USAGE: 'none',
    });
    assert.deepEqual([unsupported.on.reported, unsupported.on.tokenRuns], [0, 0]);
  });
});
