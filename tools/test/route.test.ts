// Routing cases (plan WP4): every evals/routing/<case>/diff.patch must select
// exactly the references in its expected.json, across all skills with routes.
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { routeDiff } from '../src/routes.ts';

const root = resolve(import.meta.dirname, '../..');
const casesDir = join(root, 'evals/routing');
const cases = existsSync(casesDir) ? readdirSync(casesDir).filter((c) => existsSync(join(casesDir, c, 'diff.patch'))).sort() : [];

test('evals/routing has cases', () => assert.ok(cases.length >= 8, `found ${cases.length}`));

for (const name of cases) {
  test(`routing: ${name}`, () => {
    const diff = readFileSync(join(casesDir, name, 'diff.patch'), 'utf8');
    const expected = JSON.parse(readFileSync(join(casesDir, name, 'expected.json'), 'utf8')) as Record<string, string[]>;
    assert.deepEqual(routeDiff(root, diff), expected);
  });
}
