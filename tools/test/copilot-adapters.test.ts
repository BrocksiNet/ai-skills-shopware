// The Copilot ask adapter (suggest-rules) and edit adapter (suggest-rules
// draft) against a fake `copilot` that replays a recorded session and
// records its arguments, token variables and working directory.
import assert from 'node:assert/strict';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, test } from 'node:test';
import { COPILOT_ASK_TOOLS, copilotAsk } from '../src/agent-ask.ts';
import { COPILOT_EDIT_TOOLS, editor } from '../src/draft-agent.ts';

const tmp = realpathSync(mkdtempSync(join(tmpdir(), 'copilot-adapters-')));
const SESSION = join(import.meta.dirname, 'fixtures/agents/copilot-task.jsonl');
const bin = join(tmp, 'bin');
mkdirSync(bin);
writeFileSync(
  join(bin, 'copilot'),
  `#!/usr/bin/env bash
printf '%s\\n' "$@" > "$FAKE_REC.args"
printf 'TOKEN=%s GH=%s CWD=%s\\n' "\${COPILOT_GITHUB_TOKEN:-}" "\${GH_TOKEN:-}" "$PWD" > "$FAKE_REC.env"
cat "$FAKE_OUT"
`,
);
chmodSync(join(bin, 'copilot'), 0o755);

let n = 0;
/** A fresh environment with the fake CLI and its record files. */
function fake(out: string): { env: NodeJS.ProcessEnv; args: () => string; seen: () => string } {
  const rec = join(tmp, `rec-${String(++n)}`);
  return {
    env: { PATH: `${bin}:${process.env.PATH ?? ''}`, TMPDIR: tmp, FAKE_REC: rec, FAKE_OUT: out },
    args: () => readFileSync(`${rec}.args`, 'utf8'),
    seen: () => readFileSync(`${rec}.env`, 'utf8'),
  };
}

function capture(): { out: (t: string) => void; err: (t: string) => void; text: { out: string; err: string } } {
  const text = { out: '', err: '' };
  return {
    out: (t) => {
      text.out += t;
    },
    err: (t) => {
      text.err += t;
    },
    text,
  };
}

describe('copilot ask adapter', () => {
  test('only view, nothing approved, an empty folder; GH_TOKEN becomes the Copilot token', async () => {
    const f = fake(SESSION);
    const io = capture();
    const rc = await copilotAsk('do it', { ...f.env, GH_TOKEN: 'g', SUGGEST_MODEL: 'm' }, io, tmp);
    assert.equal(rc, 0);
    assert.ok(io.text.out.startsWith('Now let me check'));
    assert.ok(f.args().includes('--model\nm\n'));
    assert.ok(f.args().endsWith(`${COPILOT_ASK_TOOLS.join('\n')}\n`));
    assert.doesNotMatch(f.args(), /--allow-tool|--allow-all-tools/u);
    assert.match(f.seen(), /^TOKEN=g GH= CWD=.*\/suggest-ask\.[^/]+\/ws\n$/u);
  });
  test('a failed session prints nothing and is an agent error', async () => {
    const out = join(tmp, 'error.jsonl');
    writeFileSync(out, '{"type":"session.error","data":{"message":"quota"}}\n');
    const io = capture();
    const rc = await copilotAsk('do it', { ...fake(out).env, COPILOT_GITHUB_TOKEN: 't' }, io, tmp);
    assert.deepEqual([rc, io.text.out, io.text.err], [4, '', 'copilot-ask: quota\n']);
  });
});

describe('copilot draft adapter', () => {
  test('edits in the worktree with the pre-approved tools only', async () => {
    const f = fake(SESSION);
    const wt = join(tmp, 'wt');
    mkdirSync(wt);
    const io = capture();
    const edit = editor('copilot', { ...f.env, GH_TOKEN: 'g', DRAFT_MODEL: 'm' }, io.err);
    const r = await edit('change it', wt);
    assert.equal(r.status, 0);
    assert.ok(r.text.startsWith('Now let me check'));
    assert.ok(f.args().includes('--model\nm\n'));
    assert.ok(f.args().endsWith(`${COPILOT_EDIT_TOOLS.join('\n')}\n`));
    assert.equal(f.seen(), `TOKEN=g GH= CWD=${wt}\n`);
    assert.equal(io.text.err, '');
  });
});
