// The blind review pairs measure what api-facts adds over the skills. They
// only do that while no skill names their Shopware symbols: a skill that
// says when `getHash()` arrived answers the task without any facts.
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { test } from 'node:test';

const ROOT = resolve(import.meta.dirname, '../..');

/** Task pair -> the Shopware symbols whose release only the source can tell. */
const BLIND: Record<string, string[]> = {
  'review-later-member-guard': ['HttpCacheCookieEvent', 'getHash'],
  'review-in-minor-range': ['getPrimaryOrderTransaction'],
  'review-unneeded-guard': ['UpdateMediaPathEvent', 'MediaUploadService'],
  'review-storefront-template-range': ['navigation/flyout.html.twig', 'layout_navigation_flyout'],
  'review-js-plugin-range': ['FlyoutMenu', 'flyout-menu.plugin'],
  'review-admin-block-range': ['sw_customer_base_metadata_default_payment', 'sw-customer-base-info'],
};

function markdown(dir: string): string[] {
  return readdirSync(dir, { recursive: true, encoding: 'utf8' })
    .filter((name) => name.endsWith('.md'))
    .map((name) => join(dir, name));
}

test('every blind pair exists with both halves', () => {
  for (const pair of Object.keys(BLIND)) {
    for (const half of ['catch', 'ignore']) {
      assert.ok(existsSync(join(ROOT, 'evals/tasks', `${pair}-${half}`, 'grade.sh')), `${pair}-${half}`);
    }
  }
});

test('no skill names a symbol of a blind pair', () => {
  const leaks = markdown(join(ROOT, 'skills')).flatMap((file) => {
    const text = readFileSync(file, 'utf8');
    return Object.values(BLIND)
      .flat()
      .filter((symbol) => text.includes(symbol))
      .map((symbol) => `${file.slice(ROOT.length + 1)}: ${symbol}`);
  });
  assert.deepEqual(leaks, []);
});
