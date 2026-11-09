import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, test } from 'node:test';
import { grade } from '../graders/storefront-blocks-across-range.ts';

const PASS = join(import.meta.dirname, '../../evals/tasks/storefront-blocks-across-range/fixtures/pass');
const REPORT = readFileSync(join(PASS, '.transcript.txt'), 'utf8');

/** One flag of the grader's detail line for the pass workdir and this transcript. */
function flag(transcript: string, name: string): string | undefined {
  return new RegExp(`\\b${name}=(\\d)`, 'u').exec(grade({ workdir: PASS, transcript }).detail)?.[1];
}

describe('storefront-blocks-across-range grader', () => {
  test('removing the no-op header override is not a false alarm', () => {
    const transcript = `${REPORT}\nI removed the no-op \`page_checkout_cart_header\` override.`;
    assert.equal(flag(transcript, 'no_false_alarm'), '1');
  });

  test('saying core removed the header block is still a false alarm', () => {
    const transcript = `${REPORT}\n6.7.0.0 removed page_checkout_cart_header as well.`;
    assert.equal(flag(transcript, 'no_false_alarm'), '0');
  });

  test('"nothing errors" counts as saying the failure is silent', () => {
    const quiet = REPORT.split('\n')
      .filter((line) => !/silent|no error|not (shown|rendered)|disappear/iu.test(line))
      .join('\n');
    assert.equal(flag(quiet, 'says_silent'), '0');
    assert.equal(flag(`${quiet}\nNothing errors: the icon is just not there.`, 'says_silent'), '1');
  });
});
