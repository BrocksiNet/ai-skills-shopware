// The preflight that evals.yml runs before the shards, driven with the fake
// agent: a gone model must fail the run with the reason, a one-off error
// must not.
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { after, describe, test } from 'node:test';
import { preflight } from '../src/agent-preflight.ts';

const ROOT = resolve(import.meta.dirname, '../..');
const FAKE = join(ROOT, 'evals/runner/fake-agent.sh');
const tmp = mkdtempSync(join(tmpdir(), 'agent-preflight-test-'));
after(() => {
  rmSync(tmp, { recursive: true, force: true });
});

async function check(env: NodeJS.ProcessEnv): Promise<{ rc: number; out: string; err: string; waits: number }> {
  let out = '';
  let err = '';
  let waits = 0;
  const rc = await preflight({
    env: { PATH: process.env.PATH, TMPDIR: tmp, TASK_MODEL: 'opencode/gone-free', ...env },
    out: (t) => {
      out += t;
    },
    err: (t) => {
      err += t;
    },
    sleep: async () => {
      waits++;
      await Promise.resolve();
    },
  });
  return { rc, out, err, waits };
}

describe('agent preflight', () => {
  test('passes when the agent finishes a session', async () => {
    const r = await check({ SKILLS_AGENT_CMD: FAKE });
    assert.equal(r.rc, 0);
    assert.match(r.out, /opencode\/gone-free answered \(attempt 1\)/u);
    assert.equal(r.waits, 0);
  });

  test('fails with the reason and a hint when every attempt errors', async () => {
    const r = await check({ SKILLS_AGENT_CMD: FAKE, FAKE_AGENT_MODE: 'error', EVAL_PREFLIGHT_ATTEMPTS: '2' });
    assert.equal(r.rc, 1);
    assert.match(r.err, /attempt 2\/2 with opencode\/gone-free failed: fake-agent: simulated API error/u);
    assert.match(r.err, /opencode models --standalone/u);
    assert.equal(r.waits, 1);
  });

  test('retries a one-off error', async () => {
    const r = await check({ SKILLS_AGENT_CMD: FAKE, FAKE_AGENT_ERROR_ONCE: join(tmp, 'once') });
    assert.equal(r.rc, 0);
    assert.match(r.out, /answered \(attempt 2\)/u);
  });

  test('needs an agent command and valid numbers', async () => {
    assert.equal((await check({})).rc, 2);
    assert.equal((await check({ SKILLS_AGENT_CMD: FAKE, EVAL_PREFLIGHT_ATTEMPTS: '0' })).rc, 2);
  });
});
