import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { envInt, envOr, envSet } from '../src/env.ts';
import { errorMessage } from '../src/errors.ts';

describe('envOr and envSet', () => {
  test('an empty value counts as unset', () => {
    assert.equal(envOr({}, 'X', 'd'), 'd');
    assert.equal(envOr({ X: '' }, 'X', 'd'), 'd');
    assert.equal(envOr({ X: '0' }, 'X', 'd'), '0');
    assert.deepEqual([envSet({}, 'X'), envSet({ X: '' }, 'X'), envSet({ X: '0' }, 'X')], [false, false, true]);
  });
});

describe('envInt', () => {
  test('default, value and validation', () => {
    assert.equal(envInt({}, 'X', 4), 4);
    assert.equal(envInt({ X: '' }, 'X', 4), 4);
    assert.equal(envInt({ X: '7' }, 'X', 4), 7);
    assert.throws(() => envInt({ X: 'abc' }, 'X', 4), /X must be a number/u);
    assert.throws(() => envInt({ X: '0' }, 'X', 4, 1), /X must be >= 1/u);
    assert.throws(() => envInt({ X: '-1' }, 'X', 4, 1), /X must be >= 1/u);
  });
});

describe('errorMessage', () => {
  test('errors, strings and anything else', () => {
    assert.equal(errorMessage(new Error('boom')), 'boom');
    assert.equal(errorMessage('plain'), 'plain');
    assert.equal(errorMessage(42), 'unknown error');
  });
});
