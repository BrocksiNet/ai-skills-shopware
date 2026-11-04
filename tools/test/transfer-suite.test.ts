import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { after, test } from 'node:test';
import { freezeInputs } from '../src/transfer-freeze.ts';
import { prepareTransferSuite, runTransferSuite } from '../src/transfer-suite.ts';

const ROOT = resolve(import.meta.dirname, '../..');
const tmp = mkdtempSync(join(tmpdir(), 'transfer-suite-'));
after(() => {
  rmSync(tmp, { recursive: true, force: true });
});

test('freezing retains exact inputs and detects source changes and archive tampering', () => {
  const root = join(tmp, 'source');
  const destination = join(tmp, 'archive');
  mkdirSync(join(root, 'src'), { recursive: true });
  mkdirSync(destination);
  writeFileSync(join(root, 'src/code.ts'), 'before');
  writeFileSync(join(root, 'lock.json'), '{}');
  const verify = freezeInputs(root, destination, ['src', 'lock.json']);
  assert.throws(() => freezeInputs(root, destination, ['../source-neighbor']), /within the repository/u);
  verify();
  assert.equal(readFileSync(join(destination, 'inputs/src/code.ts'), 'utf8'), 'before');
  writeFileSync(join(root, 'src/new.ts'), 'new');
  assert.throws(verify, /inputs changed/u);
  rmSync(join(root, 'src/new.ts'));
  verify();
  writeFileSync(join(destination, 'inputs/lock.json'), 'tampered');
  assert.throws(verify, /archive changed/u);
});
test('all model schedules exist before the first trial; runs remain serial and caps are observed', async () => {
  const destination = join(tmp, 'suite');
  let active = 0;
  let calls = 0;
  const options = {
    root: ROOT,
    destination,
    repeats: 2,
    env: {},
    log: (): void => {},
    random: (): number => 0,
    run: async (o: { env: NodeJS.ProcessEnv }): Promise<number> => {
      assert.equal(active++, 0);
      calls++;
      for (const model of ['haiku', 'sonnet', 'opus']) assert.ok(existsSync(join(destination, model, 'manifest.json')));
      writeFileSync(
        o.env.EVAL_TRACE_LOG ?? '',
        JSON.stringify({ type: 'result', subtype: 'error_max_turns', total_cost_usd: 0.2 }),
      );
      await Promise.resolve();
      active--;
      return 0;
    },
  };
  const prepared = prepareTransferSuite(options);
  assert.equal(prepared.profiles.length, 3);
  assert.ok(prepared.profiles.every((p) => p.jobs.length === 18));
  assert.equal(await runTransferSuite(options, prepared), 0);
  assert.equal(calls, 54);
  const trials = readFileSync(join(destination, 'haiku/trials.jsonl'), 'utf8');
  assert.match(trials, /error_max_turns/u);
  assert.match(trials, /"cost_usd":0.2/u);
});
