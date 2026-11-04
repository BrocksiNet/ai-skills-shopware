import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { contentHash } from '../src/eval-provenance.ts';

test('content snapshots detect edits, deletions and moves independently of traversal order', () => {
  const root = mkdtempSync(join(tmpdir(), 'eval-hash-'));
  try {
    const a = join(root, 'a');
    const b = join(root, 'b');
    writeFileSync(a, 'same');
    writeFileSync(b, 'same');
    const original = contentHash(root, [a, b]);
    assert.equal(contentHash(root, [b, a]), original);
    assert.notEqual(contentHash(root, [a]), original);
    assert.notEqual(contentHash(root, [a]), contentHash(root, [b]));
    writeFileSync(a, 'edited');
    assert.notEqual(contentHash(root, [a, b]), original);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
