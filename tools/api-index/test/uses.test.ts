import assert from 'node:assert/strict';
import { test } from 'node:test';
import { chainTargets, resolveChain, returnClass } from '../src/chains.ts';
import { parseDiff } from '../src/diff.ts';
import { factsFor, Lookup, presentThroughout } from '../src/facts.ts';
import type { Item, Snapshot } from '../src/model.ts';
import { mergeSnapshots } from '../src/timeline.ts';
import { phpUses } from '../src/uses.ts';

const targets = (code: string, how?: string): string[] =>
  phpUses(code, 'src/A.php')
    .uses.filter((use) => how === undefined || use.how === how)
    .map((use) => use.target.replace(/^php:/u, ''));

test('guards: class_exists, method_exists and string class names', () => {
  const code = `<?php
namespace Swag;
use Shopware\\Core\\Framework\\Util\\Hasher;
use Shopware\\Core\\Framework\\Context;
class A {
  public function run(): void {
    if (class_exists(Hasher::class)) {}
    if (method_exists(Context::class, 'createCLIContext')) {}
    if (\\class_exists('\\\\Shopware\\\\Core\\\\Kernel')) {}
    if (class_exists(Other::class)) {}
  }
}`;
  assert.deepEqual(targets(code, 'guard'), [
    'Shopware\\Core\\Framework\\Util\\Hasher',
    'Shopware\\Core\\Framework\\Context::createCLIContext()',
    'Shopware\\Core\\Kernel',
  ]);
});

test('instanceof narrows a variable in a ternary, an if and an &&', () => {
  const code = `<?php
namespace Swag;
use Shopware\\Core\\Content\\Product\\ProductEntity;
use Shopware\\Core\\Content\\Product\\SalesChannel\\SalesChannelProductEntity as Sales;
class A {
  public function run(ProductEntity $p): void {
    $a = $p instanceof Sales ? $p->getCalculatedPrice() : null;
    if ($p instanceof Sales && $a !== null) { $p->getCalculatedPrices(); } else { $p->getName(); }
    $p instanceof Sales && $p->getSeoCategory();
    $p->getId();
  }
}`;
  const calls = targets(code, 'call').map((target) => target.replace(/^Shopware\\Core\\Content\\Product\\/u, ''));
  assert.deepEqual(calls, [
    'SalesChannel\\SalesChannelProductEntity::getCalculatedPrice()',
    'SalesChannel\\SalesChannelProductEntity::getCalculatedPrices()',
    'ProductEntity::getName()',
    'SalesChannel\\SalesChannelProductEntity::getSeoCategory()',
    'ProductEntity::getId()',
  ]);
});

const klass = (id: string, extra: Partial<Item> = {}): Item => ({
  id,
  kind: 'class',
  file: 'src/X.php',
  flags: {},
  ...extra,
});
const method = (id: string): Item => ({
  id,
  kind: 'method',
  file: 'src/X.php',
  visibility: 'public',
  signature: '(): void',
  flags: {},
});

const snap = (ref: string, items: Item[]): Snapshot => ({
  schema: 1,
  generator: 'test',
  ref,
  sha: `sha-${ref}`,
  builtAt: '2026-10-22T00:00:00Z',
  failed: [],
  items,
});

function lookup(): Lookup {
  const context = klass('php:S\\Context', { implements: ['JsonSerializable'], extends: ['S\\Struct'] });
  const symfony = klass('php:S\\Event', { extends: ['Symfony\\Contracts\\EventDispatcher\\Event'] });
  return new Lookup(
    mergeSnapshots([
      snap('v6.6.0.0', [context, klass('php:S\\Struct'), symfony]),
      snap('v6.6.1.0', [context, klass('php:S\\Struct'), symfony, method('php:S\\Context::createCLIContext()')]),
    ]),
  );
}

test('a member is missing when only a PHP built-in could declare it', () => {
  const facts = factsFor(lookup(), 'php:S\\Context::createCLIContext()', 'static-call', ['6.6.0.0', '6.6.1.0']);
  assert.deepEqual(facts, [
    { target: 'php:S\\Context::createCLIContext()', kind: 'missing', releases: [['6.6.0.0', '6.6.0.0']] },
  ]);
  assert.equal(presentThroughout(lookup(), 'php:S\\Context::createCLIContext()', ['6.6.1.0']), true);
  assert.equal(presentThroughout(lookup(), 'php:S\\Context::createCLIContext()', ['6.6.0.0', '6.6.1.0']), false);
});

test('a member a non-PHP class outside the index may declare gives no fact and no presence', () => {
  assert.deepEqual(factsFor(lookup(), 'php:S\\Event::stopPropagation()', 'call', ['6.6.0.0', '6.6.1.0']), []);
  assert.equal(presentThroughout(lookup(), 'php:S\\Event::stopPropagation()', ['6.6.0.0', '6.6.1.0']), false);
  // A member PHP's JsonSerializable declares stays unknown too.
  assert.deepEqual(factsFor(lookup(), 'php:S\\Context::jsonSerialize()', 'call', ['6.6.0.0']), []);
});

test('diff: added lines per new-tree file', () => {
  const diff = parseDiff(`diff --git a/src/A.php b/src/A.php
--- a/src/A.php
+++ b/src/A.php
@@ -1,3 +1,4 @@
 <?php
-old();
+new1();
+new2();

diff --git a/src/B.php b/src/B.php
new file mode 100644
--- /dev/null
+++ b/src/B.php
@@ -0,0 +1,2 @@
+<?php
+b();
`);
  assert.deepEqual([...(diff.added.get('src/A.php') ?? [])], [2, 3]);
  assert.deepEqual([...(diff.added.get('src/B.php') ?? [])], [1, 2]);
  assert.deepEqual([...diff.files], ['src/A.php', 'src/B.php']);
});

const RULE = 'Shopware\\Core\\Checkout\\CheckoutRuleScope';

test('a negated instanceof that leaves the block narrows what follows', () => {
  const code = `<?php
namespace Swag;
use Shopware\\Core\\Framework\\Rule\\RuleScope;
use Shopware\\Core\\Checkout\\CheckoutRuleScope;
class A {
  public function match(RuleScope $scope): bool {
    if (!$scope instanceof CheckoutRuleScope) return false;
    return $scope->getCustomer() !== null;
  }
  public function block(RuleScope $scope, RuleScope $other): void {
    if (!$scope instanceof CheckoutRuleScope || !($other instanceof CheckoutRuleScope)) { throw new \\RuntimeException(); }
    $scope->getCart(); $other->getCart();
  }
  public function falls(RuleScope $scope): void {
    if (!$scope instanceof CheckoutRuleScope) { log(); }
    $scope->getContext();
    if (!$scope instanceof CheckoutRuleScope) { return; } else { other(); }
    $scope->getCurrentTime();
  }
}`;
  assert.deepEqual(targets(code, 'call'), [
    `${RULE}::getCustomer()`,
    `${RULE}::getCart()`,
    `${RULE}::getCart()`,
    'Shopware\\Core\\Framework\\Rule\\RuleScope::getContext()',
    'Shopware\\Core\\Framework\\Rule\\RuleScope::getCurrentTime()',
  ]);
});

const PAGE_EVENT = 'Shopware\\Storefront\\Page\\Product\\ProductPageLoadedEvent';

test('a call on what a Shopware call returns is a chain, also through a local', () => {
  const code = `<?php
namespace Swag;
use ${PAGE_EVENT};
class A {
  public function on(ProductPageLoadedEvent $event): void {
    $event->getPage()->getProduct()->getDescriptionTeaser();
    $product = $event->getPage()->getProduct();
    $product?->getName();
    $this->helper()->run();
  }
}`;
  const result = phpUses(code, 'src/A.php');
  assert.deepEqual(
    result.uses.filter((use) => use.how === 'call').map((use) => use.target.replace(`php:${PAGE_EVENT}`, 'E')),
    [
      'E::getPage()->getProduct()->getDescriptionTeaser()',
      'E::getPage()->getProduct()',
      'E::getPage()',
      'E::getPage()->getProduct()',
      'E::getPage()',
      'E::getPage()->getProduct()->getName()',
    ],
  );
  // `$this->helper()` is not declared in the file, and neither is what it returns.
  assert.equal(result.unresolved, 2);
});

const typed = (id: string, signature: string): Item => ({ ...method(id), signature });

test('a chain resolves per release from the return types the index stores', () => {
  const index = new Lookup(
    mergeSnapshots([
      snap('v1', [
        klass('php:Shopware\\Event'),
        klass('php:Shopware\\Page'),
        klass('php:Shopware\\Product'),
        typed('php:Shopware\\Event::getPage()', '(): Shopware\\Page'),
        typed('php:Shopware\\Page::getProduct()', '(): ?Shopware\\Product'),
        typed('php:Shopware\\Page::self()', '(): static'),
        typed('php:Shopware\\Page::getRequest()', '(): Symfony\\Request'),
        typed('php:Shopware\\Product::getName()', '(): string'),
      ]),
      snap('v2', [
        klass('php:Shopware\\Event'),
        klass('php:Shopware\\Page'),
        klass('php:Shopware\\Product'),
        typed('php:Shopware\\Event::getPage()', '(): Shopware\\Page'),
        typed('php:Shopware\\Page::getProduct()', '(): Shopware\\Product|array'),
      ]),
    ]),
  );
  assert.equal(
    resolveChain(index, 'php:Shopware\\Event::getPage()->getProduct()->getName()', 0),
    'php:Shopware\\Product::getName()',
  );
  assert.equal(
    resolveChain(index, 'php:Shopware\\Event::getPage()->self()->getProduct()', 0),
    'php:Shopware\\Page::getProduct()',
  );
  // A union return type, or a step that is gone, leaves the chain unresolved.
  assert.equal(resolveChain(index, 'php:Shopware\\Event::getPage()->getProduct()->getName()', 1), undefined);
  assert.equal(resolveChain(index, 'php:Shopware\\Event::getPage()->self()->getProduct()', 1), undefined);
  assert.deepEqual(
    [...chainTargets(index, 'php:Shopware\\Event::getPage()->getProduct()->getName()', index.names)],
    [['php:Shopware\\Product::getName()', index.names.slice(0, 1)]],
  );
  // The declared class may be a base of what the call returns: a method it
  // never has, or a class outside Shopware, stays unresolved.
  assert.equal(chainTargets(index, 'php:Shopware\\Event::getPage()->getQuote()', index.names).size, 0);
  assert.equal(chainTargets(index, 'php:Shopware\\Event::getPage()->getRequest()->get()', index.names).size, 0);
  assert.equal(returnClass('(int $a): void', 'Shopware\\X'), undefined);
  assert.equal(returnClass('(): ?Shopware\\Y', 'Shopware\\X'), 'Shopware\\Y');
});
