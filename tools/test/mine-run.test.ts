// The `report` and `advance` commands behind tools/bin/mine-trunk.ts (plan
// WP12 step 1), with the GitHub API answered from the recorded WP8 window.
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, test } from 'node:test';
import type { GitHubApi } from '../src/github.ts';
import { advance, readStates, report as runReport } from '../src/mine-run.ts';

const ROOT = resolve(import.meta.dirname, '../..');
const FIXTURE = join(import.meta.dirname, 'fixtures/mining/shopware-2026-10-13..2026-10-19.json');

function recorded(): GitHubApi {
  const body: unknown = JSON.parse(readFileSync(FIXTURE, 'utf8'));
  const responses = new Map(Object.entries(typeof body === 'object' && body !== null ? body : {}));
  return (path) => (responses.has(path) ? Promise.resolve(responses.get(path)) : Promise.reject(new Error(path)));
}

describe('the report and advance commands', () => {
  test('report reads one source over a window', async () => {
    const t = await runReport({
      root: ROOT,
      api: recorded(),
      since: '2026-10-13',
      until: '2026-10-19',
      source: 'shopware',
    });
    assert.match(t, /^\| `shopware` \| 2026-10-13 \| 12 \| 8 \|/mu);
    await assert.rejects(runReport({ root: ROOT, api: recorded(), source: 'nope' }), /unknown source nope/u);
    await assert.rejects(runReport({ root: ROOT, api: recorded(), since: '2026-10-13' }), /go together/u);
  });
  test('advance merges the report states and keeps the other sources', () => {
    const root = mkdtempSync(join(tmpdir(), 'mine-'));
    mkdirSync(join(root, 'docs'));
    const old = { last_sha: 'a', last_date: '2026-10-01T00:00:00Z' };
    writeFileSync(join(root, 'docs/.mining-state.json'), JSON.stringify({ shopware: old, up: old }));
    const next = { last_sha: 'b', last_date: '2026-10-20T00:00:00Z' };
    const states = advance(root, `x\n<!-- mine-trunk-state: ${JSON.stringify({ shopware: next })} -->\n`);
    assert.deepEqual(states, { shopware: next, up: old });
    assert.deepEqual(readStates(root), states);
  });
});
