// The shell wrappers in scripts/ and evals/runner/ exec the bins in
// tools/bin; these tests run them as CI and users do.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { after, describe, test } from 'node:test';

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

/** Runs a wrapper with bash, as CI does, with the fake agent set up. */
function sh(file: string, args: string[], env: NodeJS.ProcessEnv): { status: number | null; stdout: string } {
  return spawnSync('bash', [join(ROOT, file), ...args], { env: { ...fakeEnv(), ...env }, encoding: 'utf8' });
}

describe('shell wrappers', () => {
  const wrappers = [
    ...readdirSync(join(ROOT, 'scripts')).map((f) => `scripts/${f}`),
    ...readdirSync(RUNNER).map((f) => `evals/runner/${f}`),
  ].filter((f) => f.endsWith('.sh') && readFileSync(join(ROOT, f), 'utf8').includes('exec node'));

  test('every wrapper execs a bin that exists', () => {
    assert.ok(wrappers.length >= 12, wrappers.join(' '));
    for (const w of wrappers) {
      const bin = /"\$ROOT\/(tools\/bin\/[a-z-]+\.ts)"/u.exec(readFileSync(join(ROOT, w), 'utf8'))?.[1];
      assert.ok(bin !== undefined && existsSync(join(ROOT, bin)), `${w} -> ${bin ?? 'no bin'}`);
    }
  });
  test('wrappers pass arguments, environment and exit codes through', () => {
    const plan = sh('scripts/eval-plan.sh', [], { EVAL_TASKS: `${TASK_A},${TASK_B}`, EVAL_SHARDS: '2' });
    assert.equal(
      plan.stdout.trim(),
      JSON.stringify({
        tasks: [TASK_A, TASK_B],
        count: 2,
        shards: [
          { id: 1, tasks: TASK_A },
          { id: 2, tasks: TASK_B },
        ],
      }),
    );
    assert.equal(sh('scripts/eval-plan.sh', [], { EVAL_TASKS: 'nope' }).status, 2);

    const results = fresh('wrapper.jsonl');
    const run = sh('evals/runner/ab.sh', [TASK_A, '1'], { EVAL_RESULTS: results, FAKE_AGENT_MODE: 'skill-helps' });
    assert.equal(run.status, 0, run.stdout);
    assert.equal(sh('scripts/eval-gate.sh', [results], { EVAL_GATE_MIN_LOAD_PCT: '0' }).status, 0);
    assert.equal(sh('evals/runner/run-task.sh', [TASK_A, 'sideways'], {}).status, 2);
    assert.equal(sh('scripts/run-activation-evals.sh', [], { SKILLS_AGENT_CMD: '' }).status, 0);
  });
});
