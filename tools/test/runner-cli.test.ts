// The runner's command-line layer: runAb and the env parsing of the plan
// and gate. Together with ab.test.ts, eval-local.test.ts and
// wrappers.test.ts these replace evals/runner/selftest.sh.
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { after, describe, test } from 'node:test';
import { runAb } from '../src/ab-run.ts';
import { gateOptionsFromEnv } from '../src/eval-gate.ts';
import { planOptionsFromEnv } from '../src/eval-plan.ts';
import { parseResults } from '../src/eval-results.ts';
import { inSeries } from '../src/series.ts';

const ROOT = resolve(import.meta.dirname, '../..');
const RUNNER = join(ROOT, 'evals/runner');
const TASK_A = 'dal-search-without-limit';
const TASK_B = 'no-empty-explicit';
const tmp = mkdtempSync(join(tmpdir(), 'runner-cli-test-'));
after(() => {
  rmSync(tmp, { recursive: true, force: true });
});

let n = 0;
const fresh = (name: string): string => join(tmp, `${++n}-${name}`);

const fakeEnv = (over: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv => ({
  PATH: process.env.PATH,
  HOME: process.env.HOME,
  TMPDIR: tmp,
  SKILLS_AGENT_CMD: join(RUNNER, 'fake-agent.sh'),
  SKILLS_PROFILE_CMD: join(RUNNER, 'skills-profile.sh'),
  EVAL_AGENT_RETRIES: '0',
  EVAL_AGENT_RETRY_WAIT: '0',
  ...over,
});

interface Ran {
  rc: number;
  out: string;
  err: string;
}

async function ab(task: string, repeats: string, env: NodeJS.ProcessEnv): Promise<Ran> {
  let out = '';
  let err = '';
  const rc = await runAb({
    root: ROOT,
    task,
    repeats,
    env,
    out: (t) => {
      out += t;
    },
    err: (t) => {
      err += t;
    },
  });
  return { rc, out, err };
}

describe('runAb', () => {
  test('appends one record per A/B and prints the summary', async () => {
    const results = fresh('ab.jsonl');
    const env = fakeEnv({
      EVAL_RESULTS: results,
      EVAL_AGENT: 'fake',
      TASK_MODEL: 'none',
      FAKE_AGENT_MODE: 'always-pass',
    });
    assert.equal((await ab(TASK_B, '1', env)).rc, 11);
    const r = await ab(TASK_B, '1', { ...env, FAKE_AGENT_MODE: 'always-fail' });
    assert.equal(r.rc, 10);
    assert.match(r.out, /^Task: no-empty-explicit {2}\(repeats=1\)$/mu);
    const records = parseResults(readFileSync(results, 'utf8'));
    assert.deepEqual(
      records.map((x) => `${x.verdict} ${x.agent ?? ''} ${x.model ?? ''}`),
      ['held fake none', 'no_difference fake none'],
    );
  });
  test('the agent label defaults to the adapter name', async () => {
    const results = fresh('label.jsonl');
    await ab(TASK_B, '1', fakeEnv({ EVAL_RESULTS: results, FAKE_AGENT_MODE: 'always-pass' }));
    assert.equal(parseResults(readFileSync(results, 'utf8'))[0]?.agent, 'fake-agent');
  });
  test('an adapter without token reporting gives null tokens', async () => {
    const results = fresh('no-usage.jsonl');
    await ab(TASK_B, '1', fakeEnv({ EVAL_RESULTS: results, FAKE_AGENT_MODE: 'always-pass', FAKE_AGENT_USAGE: 'none' }));
    const [record] = parseResults(readFileSync(results, 'utf8'));
    assert.deepEqual([record?.tokens_on, record?.tokens_off], [null, null]);
  });
  test('refusals: repeats, unknown task, no agent, no profile, bad min delta', async () => {
    const results = fresh('refused.jsonl');
    const env = fakeEnv({ EVAL_RESULTS: results });
    const cases: [string, string, NodeJS.ProcessEnv, number, RegExp][] = [
      [TASK_A, '0', env, 2, /repeats must be a positive integer/u],
      ['../x', '1', env, 2, /Unknown task: \.\.\/x/u],
      [TASK_A, '1', { ...env, SKILLS_AGENT_CMD: '' }, 3, /SKILLS_AGENT_CMD not set/u],
      [TASK_A, '1', { ...env, SKILLS_PROFILE_CMD: '' }, 2, /would load the same skills\. Refusing/u],
      [TASK_A, '1', { ...env, EVAL_AB_MIN_DELTA_PCT: 'x' }, 2, /ab: EVAL_AB_MIN_DELTA_PCT must be a number/u],
    ];
    await inSeries(cases, async ([task, repeats, e, code, message]) => {
      const r = await ab(task, repeats, e);
      assert.equal(r.rc, code, r.err);
      assert.match(r.err, message);
    });
    assert.equal(existsSync(results), false);
  });
});

describe('plan and gate options from the environment', () => {
  test('explicit tasks win over changed files', () => {
    const changed = fresh('changed.txt');
    writeFileSync(changed, 'skills/x/SKILL.md\n\nREADME.md\n');
    assert.deepEqual(planOptionsFromEnv({ EVAL_TASKS: 'a,b', EVAL_CHANGED_FILES: changed }), {
      maxTasks: 0,
      shards: 4,
      tasks: ['a', 'b'],
    });
    assert.deepEqual(planOptionsFromEnv({ EVAL_CHANGED_FILES: changed, EVAL_SHARDS: '2', EVAL_MAX_TASKS: '5' }), {
      maxTasks: 5,
      shards: 2,
      changedFiles: ['skills/x/SKILL.md', 'README.md'],
    });
    assert.deepEqual(planOptionsFromEnv({ EVAL_CHANGED_FILES: fresh('missing.txt') }).changedFiles, []);
    assert.throws(() => planOptionsFromEnv({ EVAL_SHARDS: '0' }), /EVAL_SHARDS must be >= 1/u);
  });
  test('gate options default and validate', () => {
    assert.deepEqual(gateOptionsFromEnv({}), { minPassPct: 70, maxErrorPct: 25, minLoadPct: 50 });
    assert.equal(gateOptionsFromEnv({ EVAL_GATE_MIN_LOAD_PCT: '0' }).minLoadPct, 0);
    assert.throws(() => gateOptionsFromEnv({ EVAL_GATE_MAX_ERROR_PCT: 'many' }), /must be a number/u);
  });
});
