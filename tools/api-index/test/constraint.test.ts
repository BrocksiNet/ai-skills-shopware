import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseConstraint } from '../src/constraint.ts';

function allows(constraint: string, releases: string[]): string[] {
  const check = parseConstraint(constraint);
  assert.ok(check !== undefined, constraint);
  return releases.filter((release) => check(release));
}

const RELEASES = ['6.5.8.0', '6.6.0.0', '6.6.10.29', '6.7.0.0', '6.7.15.1', '6.8.0.0'];

test('tilde, caret, wildcard and or', () => {
  assert.deepEqual(allows('~6.6.0 || ~6.7.0', RELEASES), ['6.6.0.0', '6.6.10.29', '6.7.0.0', '6.7.15.1']);
  assert.deepEqual(allows('^6.6', RELEASES), ['6.6.0.0', '6.6.10.29', '6.7.0.0', '6.7.15.1', '6.8.0.0']);
  assert.deepEqual(allows('6.7.*', RELEASES), ['6.7.0.0', '6.7.15.1']);
  assert.deepEqual(allows('~6.6.10.0', RELEASES), ['6.6.10.29']);
});

test('comparisons joined by space or comma', () => {
  assert.deepEqual(allows('>=6.6.0.0 <6.7.0.0', RELEASES), ['6.6.0.0', '6.6.10.29']);
  assert.deepEqual(allows('>=6.7,<6.8', RELEASES), ['6.7.0.0', '6.7.15.1']);
  assert.deepEqual(allows('6.7.15.1', RELEASES), ['6.7.15.1']);
});

test('an unreadable constraint is undefined', () => {
  assert.equal(parseConstraint('dev-trunk'), undefined);
});
