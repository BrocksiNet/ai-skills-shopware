import assert from 'node:assert/strict';
import { test } from 'node:test';
import { factsSummary } from '../src/facts-cli.ts';
import { run } from '../src/main-cli.ts';

const collect =
  (into: string[]) =>
  (text: string): void => {
    into.push(text);
  };

function io(): { out: string[]; err: string[]; io: Parameters<typeof run>[1] } {
  const out: string[] = [];
  const err: string[] = [];
  return { out, err, io: { out: collect(out), err: collect(err), env: {} } };
}

test('shopware-api: an old Node is refused before any command runs', async () => {
  const t = io();
  assert.equal(await run(['diff', '--help'], t.io, '24.19.0'), 2);
  assert.match(t.err.join(''), /needs Node 26 or newer; this is Node 24\.19\.0/u);
  assert.deepEqual(t.out, []);
});

test('shopware-api: help, a missing and an unknown command', async () => {
  const help = io();
  assert.equal(await run(['--help'], help.io, '26.0.0'), 0);
  assert.match(help.out.join(''), /^usage: shopware-api\.mjs <command>/u);
  const none = io();
  assert.equal(await run([], none.io, '26.0.0'), 2);
  const unknown = io();
  assert.equal(await run(['lint'], unknown.io, '26.0.0'), 2);
  assert.match(unknown.err.join(''), /unknown command: lint/u);
});

test('shopware-api: each command has its own help', async () => {
  const diff = io();
  assert.equal(await run(['diff', '--help'], diff.io, '26.0.0'), 0);
  assert.match(diff.out.join(''), /--repo <dir>/u);
  const facts = io();
  assert.equal(await run(['facts', '--help'], facts.io, '26.0.0'), 0);
  assert.match(facts.out.join(''), /<extension dir>/u);
});

test('facts summary: counts by kind, the ones that break a release first', () => {
  const facts = [{ kind: 'deprecated' }, { kind: 'missing' }, { kind: 'deprecated' }];
  assert.equal(factsSummary(facts), 'Summary: 3 facts (1 missing, 2 deprecated).');
  assert.equal(factsSummary([]), 'Summary: 0 facts.');
});
