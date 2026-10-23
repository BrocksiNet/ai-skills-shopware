// Two releases of admin, storefront, Twig and build items for the frontend tests.
import type { Item, Snapshot } from '../src/model.ts';

export function snapshot(ref: string, items: Item[]): Snapshot {
  return { schema: 1, generator: 'test', ref, sha: `sha-${ref}`, builtAt: '2026-10-22T00:00:00Z', failed: [], items };
}

function item(id: string, kind: Item['kind'], signature = '', flags: Item['flags'] = {}): Item {
  return { id, kind, file: 'f', signature, flags };
}

const BASE_TWIG = 'storefront:@Storefront/storefront/base.html.twig';
export const CHECKOUT = 'storefront:@Storefront/storefront/page/checkout/index.html.twig';

// 6.6: the block lives in base.html.twig, which the checkout page extends;
// sw_csrf and the webpack build are gone in 6.7, sw-card is deprecated there.
export const V66 = [
  item(BASE_TWIG, 'template'),
  item(`${BASE_TWIG}#base_content`, 'block'),
  item(CHECKOUT, 'template', '@Storefront/storefront/base.html.twig'),
  item('admin:sw-card', 'component', 'register'),
  item('admin:sw-card.js-method.open', 'js-method'),
  item('admin:sw-card#sw_card_title', 'block', 'sw_card'),
  item('admin:sw-text-field', 'component', 'register'),
  item('admin:sw-card.prop.title', 'prop', 'optional'),
  item('twig:function:sw_csrf', 'twig', 'function', { deprecated: 'v6.7.0' }),
  item('build:admin.webpack', 'build'),
  item('js-plugin:ScrollUp', 'js-plugin', '[data-scroll-up]'),
];
export const V67 = [
  ...V66.filter((entry) => !/sw_csrf|webpack|^admin:sw-card|ScrollUp/u.test(entry.id)),
  item('admin:sw-card', 'component', 'register', { deprecated: 'v6.8.0' }),
  item('admin:sw-card.js-method.open', 'js-method'),
  item('admin:sw-card#sw_card_title', 'block', 'sw_card'),
  item('admin:sw-card.prop.title', 'prop', 'required'),
  item('js-plugin:ScrollUp', 'js-plugin', '[data-scroll-top]'),
];
