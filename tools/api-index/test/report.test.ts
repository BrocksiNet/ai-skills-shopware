import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { Lookup } from '../src/facts.ts';
import { nearbyText } from '../src/facts-cli.ts';
import type { Item, Snapshot } from '../src/model.ts';
import { describe, factsOfDir } from '../src/report.ts';
import { mergeSnapshots } from '../src/timeline.ts';

const event: Item = { id: 'php:Shopware\\Core\\Event', kind: 'class', file: 'src/Event.php', flags: {} };
const hash: Item = {
  id: 'php:Shopware\\Core\\Event::hash()',
  kind: 'method',
  file: 'src/Event.php',
  visibility: 'public',
  signature: '(): string',
  flags: {},
};

function snapshot(ref: string, items: Item[]): Snapshot {
  return { schema: 1, generator: 'test', ref, sha: `sha-${ref}`, builtAt: '2026-10-22T00:00:00Z', failed: [], items };
}

// The class arrives in 6.6.6.0, its hash() only in 6.7.6.0.
const lookup = new Lookup(
  mergeSnapshots([
    snapshot('v6.6.0.0', []),
    snapshot('v6.6.6.0', [event]),
    snapshot('v6.7.0.0', [event]),
    snapshot('v6.7.6.0', [event, hash]),
  ]),
);

function factsOf(services: string, subscriber: string): Map<string, string | undefined> {
  const dir = mkdtempSync(join(tmpdir(), 'api-facts-'));
  try {
    mkdirSync(join(dir, 'src'));
    writeFileSync(join(dir, 'src/services.php'), `<?php\nuse Shopware\\Core\\Event;\n${services}\n`);
    writeFileSync(
      join(dir, 'src/Subscriber.php'),
      `<?php\nuse Shopware\\Core\\Event;\nclass Subscriber {\n  public function on(Event $event): void {\n${subscriber}\n  }\n}\n`,
    );
    const report = factsOfDir(lookup, dir, '~6.6.0 || ~6.7.0');
    return new Map(
      report.facts
        .filter((fact) => fact.kind === 'missing')
        .map((fact) => [
          fact.target,
          fact.unguarded === undefined ? fact.guard?.file : `open ${JSON.stringify(fact.unguarded)}`,
        ]),
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('a class guard covers a member only in releases without the class', () => {
  const facts = factsOf('if (class_exists(Event::class)) { register(); }', '$event->hash();');
  assert.equal(facts.get('php:Shopware\\Core\\Event'), 'src/services.php');
  assert.equal(facts.get('php:Shopware\\Core\\Event::hash()'), 'open [["6.6.6.0","6.7.0.0"]]');
});

test('a method_exists guard covers the member in every release', () => {
  const facts = factsOf(
    'if (class_exists(Event::class)) { register(); }',
    "if (method_exists(Event::class, 'hash')) { $event->hash(); }",
  );
  assert.equal(facts.get('php:Shopware\\Core\\Event::hash()'), 'src/Subscriber.php');
});

const CART = 'storefront:@Storefront/storefront/page/checkout/cart/index.html.twig';
function block(name: string, body?: string): Item {
  return {
    id: `${CART}#${name}`,
    kind: 'block',
    file: 'f',
    signature: '',
    flags: {},
    ...(body === undefined ? {} : { body }),
  };
}
const cartTemplate: Item = { id: CART, kind: 'template', file: 'f', signature: '', flags: {} };

// 6.7 drops page_checkout_cart_shipping_costs_trigger; its siblings stay, one of them only from 6.7.
const blocks = new Lookup(
  mergeSnapshots([
    snapshot('v6.6.0.0', [
      cartTemplate,
      block('page_checkout_cart_shipping_costs'),
      block('page_checkout_cart_shipping_costs_trigger'),
    ]),
    snapshot('v6.7.0.0', [
      cartTemplate,
      block('page_checkout_cart_shipping_costs'),
      block('page_checkout_cart_shipping_costs_form'),
      block('page_checkout_cart_other'),
    ]),
  ]),
);

test('a missing block names the blocks its template still has there, whole-range ones first', () => {
  const dir = mkdtempSync(join(tmpdir(), 'api-facts-'));
  try {
    mkdirSync(join(dir, 'src/Resources/views/storefront/page/checkout/cart'), { recursive: true });
    writeFileSync(
      join(dir, 'src/Resources/views/storefront/page/checkout/cart/index.html.twig'),
      `{% sw_extends '@Storefront/storefront/page/checkout/cart/index.html.twig' %}\n{% block page_checkout_cart_shipping_costs_trigger %}x{% endblock %}\n`,
    );
    const report = factsOfDir(blocks, dir, '~6.6.0 || ~6.7.0');
    const missing = report.facts.find((fact) => fact.kind === 'missing');
    assert.ok(missing !== undefined);
    assert.equal(missing.target, `${CART}#page_checkout_cart_shipping_costs_trigger`);
    assert.deepEqual(missing.nearby, [
      { name: 'page_checkout_cart_shipping_costs', throughout: true },
      { name: 'page_checkout_cart_shipping_costs_form', throughout: false },
    ]);
    // The parent block's markup is one fetch away: core's template at the first release without the block.
    assert.equal(missing.source, 'https://raw.githubusercontent.com/shopware/shopware/v6.7.0.0/f');
    assert.match(
      nearbyText(missing),
      /; core template at 6\.7\.0\.0: https:\/\/raw\.githubusercontent\.com\/shopware\/shopware\/v6\.7\.0\.0\/f$/u,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a block whose body changed lists each release that changed it, after missing', () => {
  // The body changes in 6.6.3.0 and back in 6.7.0.0; 6.6.2.0 lacks the block, which is no change.
  const changed = new Lookup(
    mergeSnapshots([
      snapshot('v6.6.0.0', [cartTemplate, block('page_checkout_cart_tax', 'one')]),
      snapshot('v6.6.2.0', [cartTemplate]),
      snapshot('v6.6.3.0', [cartTemplate, block('page_checkout_cart_tax', 'two')]),
      snapshot('v6.6.4.0', [cartTemplate, block('page_checkout_cart_tax', 'two')]),
      snapshot('v6.7.0.0', [cartTemplate, block('page_checkout_cart_tax', 'one')]),
    ]),
  );
  const dir = mkdtempSync(join(tmpdir(), 'api-facts-'));
  try {
    mkdirSync(join(dir, 'src/Resources/views/storefront/page/checkout/cart'), { recursive: true });
    writeFileSync(
      join(dir, 'src/Resources/views/storefront/page/checkout/cart/index.html.twig'),
      `{% sw_extends '@Storefront/storefront/page/checkout/cart/index.html.twig' %}\n{% block page_checkout_cart_tax %}x{% endblock %}\n`,
    );
    const report = factsOfDir(changed, dir, '~6.6.0 || ~6.7.0');
    assert.deepEqual(
      report.facts.map((fact) => [fact.kind, describe(fact)]),
      [
        ['missing', 'missing in 6.6.2.0'],
        ['changed', 'body changed in 6.6.3.0, 6.7.0.0'],
      ],
    );
    const narrowed = factsOfDir(changed, dir, '~6.6.3');
    assert.deepEqual(narrowed.facts, []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

const item = (id: string, signature?: string): Item => ({
  id,
  kind: signature === undefined ? 'class' : 'method',
  file: 'src/X.php',
  flags: {},
  ...(signature === undefined ? {} : { visibility: 'public', signature }),
});

test('a chain joins the target it resolves to, and counts as unresolved when it resolves nowhere', () => {
  const page = [
    item('php:Shopware\\Core\\Page'),
    item('php:Shopware\\Core\\Product'),
    item('php:Shopware\\Core\\Page::getProduct()', '(): Shopware\\Core\\Product'),
    item('php:Shopware\\Core\\Page::getAll()', '(): array'),
  ];
  const index = new Lookup(
    mergeSnapshots([
      snapshot('v6.6.0.0', page),
      snapshot('v6.6.1.0', [...page, item('php:Shopware\\Core\\Product::getTeaser()', '(): string')]),
    ]),
  );
  const dir = mkdtempSync(join(tmpdir(), 'api-facts-'));
  try {
    mkdirSync(join(dir, 'src'));
    writeFileSync(
      join(dir, 'src/A.php'),
      `<?php\nuse Shopware\\Core\\Page;\nclass A {\n  public function on(Page $page): void {\n    $page->getProduct()->getTeaser();\n    $page->getAll()->count();\n  }\n}\n`,
    );
    const report = factsOfDir(index, dir, '~6.6.0');
    assert.deepEqual(
      report.facts.map((fact) => [fact.kind, fact.target, fact.releases]),
      [['missing', 'php:Shopware\\Core\\Product::getTeaser()', [['6.6.0.0', '6.6.0.0']]]],
    );
    assert.equal(report.unresolved, 1);
    assert.ok(report.symbols.includes('php:Shopware\\Core\\Product::getTeaser()'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
