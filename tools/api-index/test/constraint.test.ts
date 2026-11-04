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

test('exact versions and exclusions do not widen the declared range', () => {
  assert.deepEqual(allows('6.7', ['6.7.0.0', '6.7.0.1', '6.7.1.0']), ['6.7.0.0']);
  assert.deepEqual(allows('=6.7.0.0', RELEASES), ['6.7.0.0']);
  assert.deepEqual(allows('==v6.7.0.0', RELEASES), ['6.7.0.0']);
  assert.deepEqual(allows('>=6.6 <6.8 !=6.7.0.0', RELEASES), ['6.6.0.0', '6.6.10.29', '6.7.15.1']);
});
test('constraints fail closed for malformed or unsupported terms', () => {
  for (const constraint of [
    '',
    ' ',
    ',',
    ' , ',
    '6.7.0.0.1',
    '|| ^6.7',
    '^6.7 ||',
    '6.7garbage',
    '6.7.*.1',
    '6.7 - 6.8',
    '>6.7.*',
    '^6.7.0-rc1',
    '6.7@surprise',
    '99999999999999999',
    '6.9007199254740992',
    '*oops',
    'x.y',
    '6.7@stablejunk',
    '6.7-stablejunk',
  ])
    assert.equal(parseConstraint(constraint), undefined, constraint);
});
test('inclusive and exclusive bounds, AND/OR precedence, and operator spacing', () => {
  assert.deepEqual(allows('>6.6 <=6.7', RELEASES), ['6.6.10.29', '6.7.0.0']);
  assert.deepEqual(allows('>= 6.6 < 6.7 | = 6.8.0.0', RELEASES), ['6.6.0.0', '6.6.10.29', '6.8.0.0']);
  assert.deepEqual(allows('~6.7@stable', RELEASES), ['6.7.0.0', '6.7.15.1', '6.8.0.0']);
  assert.deepEqual(allows('*', ['trunk', 'v6.7.0.0', '6.7.0.0-rc1']), ['v6.7.0.0']);
});
test('caret and tilde boundaries before 1.0 preserve the given precision', () => {
  assert.deepEqual(allows('^0.3', ['0.2.9', '0.3.0', '0.3.9', '0.4.0']), ['0.3.0', '0.3.9']);
  assert.deepEqual(allows('^0.0.3', ['0.0.2', '0.0.3', '0.0.4']), ['0.0.3']);
  assert.deepEqual(allows('^0.0', ['0.0.0', '0.0.3', '0.1.0']), ['0.0.0', '0.0.3']);
  assert.deepEqual(allows('~6', ['5.9.9', '6.0.0', '6.9.9', '7.0.0']), ['6.0.0', '6.9.9']);
  assert.deepEqual(allows('6.7.x', RELEASES), ['6.7.0.0', '6.7.15.1']);
});

test('wildcard, zero-major and four-part upper bounds stay explicit', () => {
  assert.deepEqual(allows('x', RELEASES), RELEASES);
  assert.deepEqual(allows('6.7.X', RELEASES), ['6.7.0.0', '6.7.15.1']);
  assert.deepEqual(allows('^0', ['0.0.0', '0.5.0', '1.0.0']), ['0.0.0', '0.5.0']);
  assert.deepEqual(allows('^0.0.0', ['0.0.0', '0.0.1']), ['0.0.0']);
  assert.deepEqual(allows('~6.7.0.0', ['6.7.0.0', '6.7.0.9', '6.7.1.0']), ['6.7.0.0', '6.7.0.9']);
  for (const constraint of ['<6.7.*', '!=6.7.*', '^6.7.*']) assert.equal(parseConstraint(constraint), undefined);
});

test('multi-digit major versions and unspaced OR terms are read without truncation', () => {
  assert.deepEqual(allows('^10.2', ['9.9.9', '10.2.0', '10.9.0', '11.0.0']), ['10.2.0', '10.9.0']);
  assert.deepEqual(allows('6.7.0.0||6.8.0.0', RELEASES), ['6.7.0.0', '6.8.0.0']);
  assert.deepEqual(allows('6.7.0.0|6.8.0.0', RELEASES), ['6.7.0.0', '6.8.0.0']);
  assert.deepEqual(allows('6.7.0.0-stable', RELEASES), ['6.7.0.0']);
});

test('stability qualifiers belong only at the end and multi-space operators keep their bounds', () => {
  for (const invalid of ['6.7@stable.0', '6.7-stable.0', 'bad>=6.7', '6.7.x.0'])
    assert.equal(parseConstraint(invalid), undefined, invalid);
  assert.deepEqual(allows('>=   6.7.0.0,  <   6.8.0.0', RELEASES), ['6.7.0.0', '6.7.15.1']);
  assert.deepEqual(allows('>=6.7.0.0, <6.8.0.0', RELEASES), ['6.7.0.0', '6.7.15.1']);
  assert.deepEqual(allows('  >= 6.7.0.0, < 6.8.0.0  ', RELEASES), ['6.7.0.0', '6.7.15.1']);
});
