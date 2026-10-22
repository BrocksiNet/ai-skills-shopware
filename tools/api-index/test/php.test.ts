import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseBatch } from '../src/git.ts';
import { isPhpSource } from '../src/build.ts';
import type { Item } from '../src/model.ts';
import { phpItems } from '../src/php.ts';

/** The items of a file by ID; `get` fails the test for an unknown ID. */
function byId(items: Item[]): { ids: string[]; get: (id: string) => Item } {
  const map = new Map(items.map((item) => [item.id, item]));
  return {
    ids: [...map.keys()],
    get: (id) => {
      const item = map.get(id);
      assert.ok(item, `no item ${id}`);
      return item;
    },
  };
}

const CLASS = `<?php declare(strict_types=1);
namespace Shopware\\Core\\Demo;

use Shopware\\Core\\Framework\\Deprecation\\BCChange\\ReturnTypeNarrowing;
use Shopware\\Core\\Framework\\Log\\Package;
use Shopware\\Core\\System\\SalesChannel\\SalesChannelContext as Context;

/**
 * @final
 */
#[Package('inventory')]
class Loader extends AbstractLoader implements \\Countable
{
    public const NAME = 'loader';
    private const SECRET = 1;

    protected ?array $cache = null;

    public function __construct(private readonly Context $context, public int $limit = 10) {}

    /**
     * @deprecated tag:v6.8.0 - Use loadAll() instead
     */
    #[ReturnTypeNarrowing(version: 'v6.8.0', newType: 'static')]
    public static function load(?string $id, Context|string $context, int ...$rest): ?self {}

    function count(): int {}

    private function hidden(): void {}
}
`;

test('a class: members, signatures, resolved names and flags', () => {
  const items = byId(phpItems(CLASS, 'src/Core/Demo/Loader.php'));
  assert.deepEqual(items.ids.toSorted(), [
    'php:Shopware\\Core\\Demo\\Loader',
    'php:Shopware\\Core\\Demo\\Loader::$cache',
    'php:Shopware\\Core\\Demo\\Loader::$limit',
    'php:Shopware\\Core\\Demo\\Loader::NAME',
    'php:Shopware\\Core\\Demo\\Loader::__construct()',
    'php:Shopware\\Core\\Demo\\Loader::count()',
    'php:Shopware\\Core\\Demo\\Loader::load()',
  ]);
  const head = items.get('php:Shopware\\Core\\Demo\\Loader');
  assert.deepEqual(head.extends, ['Shopware\\Core\\Demo\\AbstractLoader']);
  assert.deepEqual(head.implements, ['Countable']);
  assert.equal(head.package, 'inventory');
  assert.deepEqual(head.flags, { final: 'doc' });
  const load = items.get('php:Shopware\\Core\\Demo\\Loader::load()');
  assert.equal(
    load.signature,
    '(?string $id, Shopware\\Core\\System\\SalesChannel\\SalesChannelContext|string $context, int ...$rest): ?self',
  );
  assert.equal(load.static, true);
  assert.deepEqual(load.flags, { deprecated: 'v6.8.0', bcChanges: ['ReturnTypeNarrowing@v6.8.0'] });
  assert.equal(items.get('php:Shopware\\Core\\Demo\\Loader::count()').visibility, 'public');
  assert.equal(items.get('php:Shopware\\Core\\Demo\\Loader::$cache').visibility, 'protected');
  assert.equal(items.get('php:Shopware\\Core\\Demo\\Loader::$limit').signature, 'int');
});

test('internal, experimental and final keyword', () => {
  const code = `<?php
namespace A;
/** @internal */
final class Hidden {}
/**
 * @experimental feature:NEW_THING stableVersion:v6.8.0
 */
interface Next extends \\Stringable, Other { public function run(): void; }
`;
  const items = byId(phpItems(code, 'src/A.php'));
  assert.deepEqual(items.get('php:A\\Hidden').flags, { internal: true, final: 'keyword' });
  assert.deepEqual(items.get('php:A\\Next').flags, { experimental: 'v6.8.0' });
  assert.deepEqual(items.get('php:A\\Next').extends, ['Stringable', 'A\\Other']);
  assert.equal(items.get('php:A\\Next::run()').signature, '(): void');
});

test('enums, cases and classes inside an if block', () => {
  const code = `<?php
namespace A;
enum State: string { case Open = 'open'; public const DEFAULT = self::Open; }
if (class_exists(Other::class)) { class Bridge extends Other {} } else { class Bridge {} }
`;
  const ids = phpItems(code, 'src/A.php').map((item) => item.id);
  assert.deepEqual(ids, [
    'php:A\\State',
    'php:A\\State::Open',
    'php:A\\State::DEFAULT',
    'php:A\\Bridge',
    'php:A\\Bridge',
  ]);
});

test('trait use is recorded on the class, resolved', () => {
  const code = `<?php
namespace A;
use B\\IdTrait;
class Entity { use IdTrait, \\C\\Other; }
`;
  const [head] = phpItems(code, 'src/A.php');
  assert.deepEqual(head?.traits, ['B\\IdTrait', 'C\\Other']);
});

test('a file that does not parse throws', () => {
  assert.throws(() => phpItems('<?php class {', 'src/Broken.php'));
});

test('test helpers are not source', () => {
  assert.equal(isPhpSource('src/Core/Checkout/Cart/Cart.php'), true);
  assert.equal(isPhpSource('src/Core/Framework/Test/TestCaseBase/KernelTestBehaviour.php'), false);
  assert.equal(isPhpSource('src/Core/Checkout/Resources/config/services.xml'), false);
});

test('git cat-file --batch output splits per path, missing paths left out', () => {
  const out = Buffer.from('abc blob 5\nhello\nsrc/missing.php missing\ndef blob 2\nhi\n');
  const files = parseBatch(out, ['src/a.php', 'src/missing.php', 'src/b.php']);
  assert.deepEqual(
    [...files],
    [
      ['src/a.php', 'hello'],
      ['src/b.php', 'hi'],
    ],
  );
});
