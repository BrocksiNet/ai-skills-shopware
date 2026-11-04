import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { after, test } from 'node:test';
import { runTransfer } from '../src/transfer-eval.ts';
import { transferCases } from '../src/transfer-plan.ts';
import { transferOutcome } from '../src/grade/transfer.ts';

const ROOT = resolve(import.meta.dirname, '../..');
const tmp = mkdtempSync(join(tmpdir(), 'transfer-tests-'));
after(() => {
  rmSync(tmp, { recursive: true, force: true });
});

test('transfer outcome goldens reject pristine and almost-pass code and execute compliant code', () => {
  for (const c of transferCases(ROOT)) {
    const grade = transferOutcome(c.task);
    for (const [folder, expected] of [
      ['fixture', false],
      ['fixtures/fail', false],
      ['fixtures/pass', true],
    ] as const) {
      assert.equal(
        grade({ workdir: join(ROOT, 'evals/tasks', c.task, folder), transcript: '' }).pass,
        expected,
        `${c.task}/${folder}`,
      );
    }
  }
});
test('the frozen schedule covers every task/arm/repeat and measures returned reference content', async () => {
  const destination = join(tmp, 'healthy');
  const seen: string[] = [];
  const specs = transferCases(ROOT);
  const result = await runTransfer({
    root: ROOT,
    destination,
    repeats: 2,
    env: {},
    log: () => {},
    random: () => 0,
    run: async (o) => {
      assert.ok(existsSync(join(destination, 'manifest.json')), 'plan exists before any model call');
      const spec = specs.find((s) => s.task === o.task);
      assert.ok(spec);
      const reference = spec.expected_references[0];
      assert.ok(reference !== undefined);
      const skillsRoot = o.env.EVAL_SKILLS_ROOT ?? '';
      assert.ok(!skillsRoot.startsWith(ROOT));
      const content = readFileSync(join(skillsRoot, reference), 'utf8');
      const trace = [
        { type: 'system', subtype: 'init' },
        {
          type: 'assistant',
          message: {
            content: [{ type: 'tool_use', name: 'Read', id: 'r', input: { file_path: join(skillsRoot, reference) } }],
          },
        },
        { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 'r', content }] } },
      ];
      writeFileSync(o.env.EVAL_TRACE_LOG ?? '', trace.map((e) => JSON.stringify(e)).join('\n'));
      seen.push(`${o.task}:${skillsRoot}`);
      await Promise.resolve();
      return 0;
    },
  });
  assert.equal(result.code, 0);
  assert.equal(result.trials.length, 18);
  assert.equal(seen.length, 18);
  assert.ok(result.trials.every((t) => t.retrieval_observable && t.required_references_read.length === 1));
  assert.equal(readFileSync(join(destination, 'trials.jsonl'), 'utf8').trim().split('\n').length, 18);
});
test('an infrastructure error stops later sessions and records skipped rather than failed outcomes', async () => {
  let calls = 0;
  const result = await runTransfer({
    root: ROOT,
    destination: join(tmp, 'error'),
    repeats: 1,
    env: {},
    log: () => {},
    run: async () => {
      calls++;
      await Promise.resolve();
      return 5;
    },
  });
  assert.equal(result.code, 2);
  assert.equal(calls, 1);
  assert.equal(result.trials.filter((t) => t.status === 'error').length, 1);
  assert.equal(result.trials.filter((t) => t.status === 'skipped').length, 8);
});

test('a trial cannot silently alter the skill package seen by subsequent trials', async () => {
  let calls = 0;
  await assert.rejects(
    runTransfer({
      root: ROOT,
      destination: join(tmp, 'tampered'),
      repeats: 1,
      env: {},
      log: (): void => {},
      run: async (o): Promise<number> => {
        calls++;
        writeFileSync(join(o.env.EVAL_SKILLS_ROOT ?? '', 'sw-admin-js/SKILL.md'), 'changed');
        await Promise.resolve();
        return 0;
      },
    }),
    /installed skill packages changed/u,
  );
  assert.equal(calls, 1);
});

test('PHP reset oracle accepts an explicit lifecycle tag and rejects changed memo behavior', () => {
  const workdir = join(tmp, 'php-rewrites');
  cpSync(join(ROOT, 'evals/tasks/transfer-worker-reset/fixtures/pass'), workdir, { recursive: true });
  const file = join(workdir, 'src/Service/ChannelRateMemo.php');
  const original = readFileSync(file, 'utf8');
  const grade = transferOutcome('transfer-worker-reset');
  writeFileSync(file, original.replace(' implements ResetInterface', ''));
  const config = join(workdir, 'src/Resources/config/services.xml');
  writeFileSync(
    config,
    readFileSync(config, 'utf8').replace(
      'ChannelRateMemo"/>',
      'ChannelRateMemo"><tag name="kernel.reset" method="reset"/></service>',
    ),
  );
  assert.equal(grade({ workdir, transcript: '' }).pass, true, 'explicit kernel.reset tag');
  for (const changed of [
    original.replace("$channelId . ':' . $currencyId", '$channelId'),
    original.replace('??=', '='),
    original.replace('load($channelId, $currencyId)', 'load($currencyId, $channelId)'),
  ]) {
    assert.notEqual(changed, original, 'calibration rewrite must affect source');
    writeFileSync(file, changed);
    assert.equal(grade({ workdir, transcript: '' }).pass, false, 'memo key/provider behavior must survive');
  }
});
