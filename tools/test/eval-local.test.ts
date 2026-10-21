// scripts/eval-local.sh: agent setup, task plan, one A/B per task, the gate.
import assert from 'node:assert/strict';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { after, describe, test } from 'node:test';
import type { RunAbOptions } from '../src/ab-run.ts';
import { evalLocal, stamp } from '../src/eval-local.ts';
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

/** A bin folder with a `claude` and an `opencode` that are never run: the
 *  eval-local tests replace the A/B. */
const fakeBin = join(tmp, 'bin');
mkdirSync(fakeBin);
for (const cli of ['claude', 'opencode']) {
  writeFileSync(join(fakeBin, cli), '#!/usr/bin/env bash\nexit 1\n');
  chmodSync(join(fakeBin, cli), 0o755);
}

interface Local {
  rc: number;
  out: string;
  err: string;
  calls: RunAbOptions[];
}

/** eval-local with a recording A/B that writes `verdict` for every task. */
async function local(env: NodeJS.ProcessEnv, verdict = 'improved'): Promise<Local> {
  const calls: RunAbOptions[] = [];
  let out = '';
  let err = '';
  const rc = await evalLocal({
    root: ROOT,
    env: { PATH: `${fakeBin}:/usr/bin:/bin`, HOME: '/home/u', ...env },
    out: (t) => {
      out += t;
    },
    err: (t) => {
      err += t;
    },
    now: new Date('2026-10-21T07:03:31.123Z'),
    ab: async (o) => {
      calls.push(o);
      const record = { task: o.task, repeats: 1, on: 1, off: 0, verdict, loaded_on: null, loaded_off: null };
      const file = o.env.EVAL_RESULTS ?? '';
      writeFileSync(file, `${existsSync(file) ? readFileSync(file, 'utf8') : ''}${JSON.stringify(record)}\n`);
      await Promise.resolve();
      return 0;
    },
  });
  return { rc, out, err, calls };
}

describe('eval-local', () => {
  test('claude by default: wrapper adapter, haiku, one A/B per task, then the gate', async () => {
    const results = fresh('local.jsonl');
    const r = await local({ EVAL_TASKS: `${TASK_A},${TASK_B}`, REPEATS: '2', EVAL_RESULTS: results });
    assert.equal(r.rc, 0, r.err);
    assert.deepEqual(
      r.calls.map((c) => `${c.task} ${c.repeats}`),
      [`${TASK_A} 2`, `${TASK_B} 2`],
    );
    const [first] = r.calls;
    assert.ok(first);
    assert.equal(first.env.SKILLS_AGENT_CMD, join(RUNNER, 'claude-task.sh'));
    assert.equal(first.env.SKILLS_PROFILE_CMD, join(RUNNER, 'skills-profile.sh'));
    assert.deepEqual([first.env.EVAL_AGENT, first.env.TASK_MODEL], ['claude', 'haiku']);
    assert.match(r.err, /^Agent claude, model haiku, 2 task\(s\), 2 repeat\(s\)$/mu);
    assert.match(r.out, /- Gate: \*\*PASS\*\*/u);
  });
  test('opencode brings the user login; the results file is stamped', async () => {
    const r = await local({ EVAL_LOCAL_AGENT: 'opencode', EVAL_TASKS: TASK_B, EVAL_RESULTS: '' }, 'worse');
    assert.equal(r.rc, 1);
    const [call] = r.calls;
    assert.ok(call);
    assert.equal(call.env.OPENCODE_AUTH_FILE, '/home/u/.local/share/opencode/auth.json');
    assert.equal(call.env.SKILLS_AGENT_CMD, join(RUNNER, 'opencode-task.sh'));
    assert.equal(call.env.EVAL_RESULTS, join(ROOT, 'evals/.results/local-20261021T070331Z.jsonl'));
    rmSync(call.env.EVAL_RESULTS, { force: true });
  });
  test('nothing to run is exit 2', async () => {
    const docsOnly = fresh('changed.txt');
    writeFileSync(docsOnly, 'README.md\n');
    const cases: [NodeJS.ProcessEnv, RegExp][] = [
      [{ EVAL_LOCAL_AGENT: 'cursor' }, /EVAL_LOCAL_AGENT must be claude or opencode/u],
      [{ PATH: '/usr/bin:/bin' }, /claude CLI not found/u],
      [{ EVAL_TASKS: 'does-not-exist' }, /eval-plan: unknown task 'does-not-exist'/u],
      [{ EVAL_CHANGED_FILES: docsOnly }, /No tasks selected/u],
    ];
    await inSeries(cases, async ([env, message]) => {
      const r = await local(env);
      assert.equal(r.rc, 2);
      assert.match(r.err, message);
      assert.equal(r.calls.length, 0);
    });
  });
  test('the stamp matches date -u +%Y%m%dT%H%M%SZ', () => {
    assert.equal(stamp(new Date('2026-01-02T03:04:05.678Z')), '20260102T030405Z');
  });
});
