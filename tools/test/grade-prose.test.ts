import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { proseOf, proseTells, tellList } from '../src/grade/prose.ts';

describe('proseTells', () => {
  test('plain text has no tells', () => {
    assert.deepEqual(proseTells('Clear the cache, then reload the product page.\n'), {});
  });

  test('finds staged contrasts, chat phrases and dashes', () => {
    const tells = proseTells("It's not just a fix, it's a new way to work — great question! I hope this helps.");
    assert.equal(tells.not_x_but_y, 1);
    assert.equal(tells.dash, 1);
    assert.equal(tells.chatbot, 2);
  });

  test('two or more bold-label list items are tells, one is not', () => {
    assert.deepEqual(proseTells('- **Composer:** widen it.\n- plain item\n'), {});
    assert.equal(proseTells('- **Composer:** widen it.\n1. **Migration.** run it twice.\n').bold_labels, 2);
  });

  test('ignores code, headings and checklist lines', () => {
    const text =
      '### Seamless heading\n\n`serves as` in code\n\n```\nfoo -- bar\n```\n\n- [ ] **Only** non-obvious code\n';
    assert.deepEqual(proseTells(text), {});
  });

  test('unwraps one outer fence, so a copy-ready reply is graded as prose', () => {
    assert.equal(proseOf('```\nHello — Jana\n```\n'), 'Hello — Jana');
    assert.equal(tellList(proseTells('```\nHello — Jana\n```\n')), 'dash:1');
  });

  test('tellList reads none when clean', () => {
    assert.equal(tellList({}), 'none');
  });
});
