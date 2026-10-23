import assert from 'node:assert/strict';
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { after, describe, test } from 'node:test';
import { activated, extractPrompts, runActivation } from '../src/activation.ts';

const ROOT = resolve(import.meta.dirname, '../..');
const tmp = mkdtempSync(join(tmpdir(), 'activation-test-'));
after(() => {
  rmSync(tmp, { recursive: true, force: true });
});

interface Result {
  rc: number;
  out: string;
}

async function activation(root: string, env: NodeJS.ProcessEnv = {}): Promise<Result> {
  let out = '';
  const rc = await runActivation({
    root,
    env: { PATH: process.env.PATH, ...env },
    out: (t) => {
      out += t;
    },
    err: () => {},
  });
  return { rc, out };
}

let n = 0;
/** A repo with skills `alpha` (both files) and `beta` (no should-not file),
 *  and an activation command that loads `alpha` for prompts about tests. */
function repo(command: string): { root: string; cmd: string } {
  const root = join(tmp, `repo-${++n}`);
  mkdirSync(join(root, 'skills/alpha/evals'), { recursive: true });
  mkdirSync(join(root, 'skills/beta/evals'), { recursive: true });
  writeFileSync(join(root, 'skills/alpha/evals/should-trigger.md'), '# T\n\n- Write a test\n- Fix a bug\n');
  writeFileSync(join(root, 'skills/alpha/evals/should-not-trigger.md'), '- Deploy the app\n');
  writeFileSync(join(root, 'skills/beta/evals/should-trigger.md'), '- Write a test for beta\n');
  const cmd = join(root, 'activate.sh');
  writeFileSync(cmd, `#!/usr/bin/env bash\n${command}\n`);
  chmodSync(cmd, 0o755);
  return { root, cmd };
}

describe('prompt extraction', () => {
  test('list items only, quotes and reviewer notes stripped', () => {
    const md = [
      '# Should trigger',
      '',
      '- Plain prompt',
      '- "Quoted prompt" (-> sw-testing)',
      '- Prompt with a note (should load sw-testing).',
      '- Keep (this part) of the prompt',
      '- Ends on a skill (sw-php-foundation)',
      '  - nested items are not prompts',
      '* other bullets are not prompts',
    ].join('\n');
    assert.deepEqual(extractPrompts(md), [
      'Plain prompt',
      'Quoted prompt',
      'Prompt with a note',
      'Keep (this part) of the prompt',
      'Ends on a skill',
    ]);
  });
  test('a skill counts only as a whole entry', () => {
    assert.equal(activated('sw-testing\nsw-php-foundation\n', 'sw-php-foundation'), true);
    assert.equal(activated('sw-testing, sw-php-foundation', 'sw-testing'), true);
    assert.equal(activated('shopware-testing-extra', 'sw-testing'), false);
    assert.equal(activated('', 'sw-testing'), false);
  });
});

describe('activation evals', () => {
  test('dry mode on the repository: every skill has both files', async () => {
    const r = await activation(ROOT);
    assert.equal(r.rc, 0, r.out);
    assert.match(r.out, /running in --dry mode/u);
    assert.match(r.out, /^ {2}\[dry\] \(trigger\) sw-testing <- /mu);
    assert.match(r.out, /pass=0 fail=0 missing-files=0 errors=0\n$/u);
  });
  test('scores trigger and no-trigger prompts, reports a missing file', async () => {
    const { root, cmd } = repo('case "$(cat)" in *test*) echo alpha ;; esac');
    const r = await activation(root, { SKILLS_ACTIVATION_CMD: cmd });
    assert.equal(r.rc, 1);
    assert.match(r.out, /^ {2}FAIL \(trigger, got quiet\) alpha <- Fix a bug$/mu);
    assert.match(r.out, /^ {2}FAIL \(trigger, got quiet\) beta <- Write a test for beta$/mu);
    assert.match(r.out, /^ {2}MISSING: skills\/beta\/evals\/should-not-trigger\.md$/mu);
    assert.match(r.out, /pass=2 fail=2 missing-files=1 errors=0/u);
  });
  test('SKILLS_AGENT_CMD is the fallback command', async () => {
    const { root, cmd } = repo('cat >/dev/null; echo alpha beta');
    const r = await activation(root, { SKILLS_AGENT_CMD: cmd });
    assert.match(r.out, /pass=3 fail=1 missing-files=1 errors=0/u);
  });
  test('the first agent error stops the run, so it never reads as quiet', async () => {
    const { root, cmd } = repo('cat >/dev/null; exit 3');
    const r = await activation(root, { SKILLS_ACTIVATION_CMD: cmd });
    assert.equal(r.rc, 1);
    assert.match(r.out, /ERROR \(trigger\) alpha <- Write a test \(agent failed; no score recorded\)/u);
    assert.doesNotMatch(r.out, /Skill: beta/u);
    assert.match(r.out, /pass=0 fail=0 missing-files=0 errors=1/u);
  });
});
