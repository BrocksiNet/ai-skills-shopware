import assert from 'node:assert/strict';
import { test } from 'node:test';
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
