// The test double itself; ab.test.ts and runner-cli.test.ts drive it
// through the runner.
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { after, describe, test } from 'node:test';
import { fakeAgent } from '../src/fake-agent.ts';
import { inSeries } from '../src/series.ts';

const ROOT = resolve(import.meta.dirname, '../..');
const TASK = 'no-empty-explicit';
const tmp = mkdtempSync(join(tmpdir(), 'fake-agent-test-'));
after(() => {
  rmSync(tmp, { recursive: true, force: true });
});

interface Session {
  rc: number;
  out: string;
  err: string;
  dir: string;
  files: string[];
}

let n = 0;
/** One session in a fresh workdir with the task's fixture, and two skills
 *  when `skills` is set. */
async function session(env: NodeJS.ProcessEnv, skills: boolean): Promise<Session> {
  const dir = join(tmp, `${++n}`);
  const cwd = join(dir, 'w');
  mkdirSync(cwd, { recursive: true });
  writeFileSync(join(cwd, 'start.txt'), 'start\n');
  if (skills) {
    mkdirSync(join(cwd, '.claude/skills/shopware-testing'), { recursive: true });
    mkdirSync(join(cwd, '.claude/skills/php-foundation'), { recursive: true });
  }
  let out = '';
  let err = '';
  const rc = fakeAgent({
    root: ROOT,
    cwd,
    env: { EVAL_TASK: TASK, EVAL_SKILLS_LOG: join(dir, 'skills.log'), EVAL_USAGE_LOG: join(dir, 'usage.log'), ...env },
    out: (t) => {
      out += t;
    },
    err: (t) => {
      err += t;
    },
  });
  await Promise.resolve();
  return { rc, out, err, dir, files: readdirSync(cwd) };
}

const read = (file: string): string => (existsSync(file) ? readFileSync(file, 'utf8') : 'missing');

describe('fake agent', () => {
  test('modes against skills present and absent', async () => {
    const cases: [string, boolean, boolean][] = [
      ['skill-helps', true, true],
      ['skill-helps', false, false],
      ['skill-hurts', true, false],
      ['skill-hurts', false, true],
      ['always-pass', false, true],
      ['always-fail', true, false],
    ];
    await inSeries(cases, async ([mode, skills, solved]) => {
      const s = await session({ FAKE_AGENT_MODE: mode }, skills);
      assert.equal(s.rc, 0);
      assert.equal(s.out.endsWith(solved ? `fake-agent: solved ${TASK}\n` : 'fake-agent: no change\n'), true, mode);
      assert.equal(s.files.includes('start.txt'), !solved, mode);
      assert.equal(s.files.includes('.claude'), skills, mode);
    });
  });
  test('skill and token logs', async () => {
    const present = await session({}, true);
    assert.equal(read(join(present.dir, 'skills.log')), 'php-foundation\nshopware-testing\n');
    assert.equal(read(join(present.dir, 'usage.log')), '1200 200\n');
    const leak = await session({ FAKE_AGENT_LOAD: 'leak', FAKE_AGENT_USAGE: '5 6' }, false);
    assert.equal(read(join(leak.dir, 'skills.log')), 'php-foundation\n');
    assert.equal(read(join(leak.dir, 'usage.log')), '5 6\n');
    const quiet = await session({ FAKE_AGENT_LOAD: 'none', FAKE_AGENT_USAGE: 'none' }, true);
    assert.deepEqual([read(join(quiet.dir, 'skills.log')), read(join(quiet.dir, 'usage.log'))], ['', 'missing']);
    const unsupported = await session({ FAKE_AGENT_LOAD: 'unsupported' }, false);
    assert.deepEqual(
      [read(join(unsupported.dir, 'skills.log')), read(join(unsupported.dir, 'usage.log'))],
      ['missing', '1000 100\n'],
    );
  });
  test('one-shot faults hit the first call only', async () => {
    const marker = join(tmp, 'once');
    const first = await session({ FAKE_AGENT_ERROR_ONCE: marker }, true);
    assert.deepEqual([first.rc, first.err], [4, 'fake-agent: simulated one-off API error\n']);
    assert.equal((await session({ FAKE_AGENT_ERROR_ONCE: marker }, true)).rc, 0);
    const failOnce = await session({ FAKE_AGENT_FAIL_ONCE: join(tmp, 'fail-once') }, true);
    assert.deepEqual([failOnce.rc, failOnce.out], [0, 'fake-agent: no change\n']);
  });
  test('errors and usage mistakes', async () => {
    const cases: [NodeJS.ProcessEnv, number, string][] = [
      [{ FAKE_AGENT_MODE: 'error' }, 4, 'fake-agent: simulated API error\n'],
      [{ FAKE_AGENT_MODE: 'bogus' }, 2, "fake-agent: unknown FAKE_AGENT_MODE 'bogus'\n"],
      [{ FAKE_AGENT_LOAD: 'weird' }, 2, 'fake-agent: unknown FAKE_AGENT_LOAD\n'],
      [
        { EVAL_TASK: 'no-such-task', FAKE_AGENT_MODE: 'always-pass' },
        4,
        'fake-agent: no-such-task has no fixtures/pass\n',
      ],
      [{ EVAL_TASK: '' }, 1, 'fake-agent: EVAL_TASK not set (run through run-task.sh)\n'],
    ];
    await inSeries(cases, async ([env, rc, err]) => {
      const s = await session(env, true);
      assert.deepEqual([s.rc, s.err], [rc, err]);
    });
  });
});
