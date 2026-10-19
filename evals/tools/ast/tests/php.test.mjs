import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  astHasIdentifier,
  attributeBasename,
  attributeClassRefNames,
  classAttributes,
  findClass,
  findMethod,
  methodAttributes,
  parsePhp,
} from '../src/php.mjs';
import { evaluateServicesPhp } from '../src/tasks/plugin-xml-config-to-php.mjs';
import { evaluate as evaluateCovers } from '../src/tasks/one-covers-class-per-file.mjs';
import { evaluate as evaluateBc } from '../src/tasks/bc-change-not-deprecated-reason.mjs';
import { evaluate as evaluateEventHook } from '../src/tasks/event-hook-capture-then-assert.mjs';

test('commented CoversClass is not an attribute node', () => {
  const ast = parsePhp(`<?php
// #[CoversClass(CartNormalizer::class)]
final class CartNormalizerTest {}
`);
  const cls = findClass(ast, 'CartNormalizerTest');
  const covers = classAttributes(cls).filter((attr) => attributeBasename(attr) === 'CoversClass');
  assert.equal(covers.length, 0);
  assert.equal(evaluateCovers(ast).score, 0);
});

test('real CoversClass on the test class passes', () => {
  const ast = parsePhp(`<?php
#[CoversClass(CartNormalizer::class)]
final class CartNormalizerTest {}
`);
  const cls = findClass(ast, 'CartNormalizerTest');
  const covers = classAttributes(cls).filter((attr) => attributeBasename(attr) === 'CoversClass');
  assert.deepEqual(attributeClassRefNames(covers[0]), ['CartNormalizer']);
  assert.equal(evaluateCovers(ast).score, 1);
});

test('second CoversClass on the same class fails', () => {
  const ast = parsePhp(`<?php
#[CoversClass(CartNormalizer::class)]
#[CoversClass(LineItemHelper::class)]
final class CartNormalizerTest {}
`);
  assert.equal(evaluateCovers(ast).score, 0);
});

test('ParameterTypeNarrowing on unused() is not on load()', () => {
  const ast = parsePhp(`<?php
use Shopware\\Core\\Framework\\Deprecation\\BCChange\\ParameterTypeNarrowing;
final class LegacyIdLoader {
    #[ParameterTypeNarrowing(version: 'v6.8.0', parameterName: 'id', newType: 'string')]
    private function unused(string|int $id): string { return (string) $id; }
    public function load(string|int $id): string { return (string) $id; }
}
`);
  const load = findMethod(findClass(ast, 'LegacyIdLoader'), 'load');
  const attrs = methodAttributes(load).filter((attr) => attributeBasename(attr) === 'ParameterTypeNarrowing');
  assert.equal(attrs.length, 0);
  assert.equal(evaluateBc(ast, '').score, 0);
});

test('ParameterTypeNarrowing on load() with named-arg order swap passes', () => {
  const ast = parsePhp(`<?php
use Shopware\\Core\\Framework\\Deprecation\\BCChange\\ParameterTypeNarrowing;
final class LegacyIdLoader {
    #[ParameterTypeNarrowing(newType: 'string', parameterName: 'id', version: 'v6.8.0')]
    public function load(int|string $id): string { return (string) $id; }
}
`);
  assert.equal(evaluateBc(ast, '').score, 1);
});

test('@deprecated reason in source fails even when the attribute is correct', () => {
  const ast = parsePhp(`<?php
use Shopware\\Core\\Framework\\Deprecation\\BCChange\\ParameterTypeNarrowing;
final class LegacyIdLoader {
    #[ParameterTypeNarrowing(version: 'v6.8.0', parameterName: 'id', newType: 'string')]
    public function load(string|int $id): string { return (string) $id; }
}
`);
  assert.equal(evaluateBc(ast, "/** @deprecated reason: no */").score, 0);
});

test('unparseable PHP is null, not a throw', () => {
  assert.equal(parsePhp('<?php class {'), null);
});

test('CoversClass on a second class in the same file fails', () => {
  const ast = parsePhp(`<?php
#[CoversClass(CartNormalizer::class)]
final class CartNormalizerTest {}
#[CoversClass(LineItemHelper::class)]
final class LineItemHelperTest {}
`);
  assert.equal(evaluateCovers(ast).score, 0);
});

test('ContainerConfigurator plus ProductLoader in services.php counts', () => {
  const ast = parsePhp(`<?php
use Symfony\\Component\\DependencyInjection\\Loader\\Configurator\\ContainerConfigurator;
use SwagExample\\ProductLoader;
return static function (ContainerConfigurator $container): void {
    $container->services()->set(ProductLoader::class);
};
`);
  assert.equal(astHasIdentifier(ast, 'ContainerConfigurator'), true);
  assert.equal(astHasIdentifier(ast, 'ProductLoader'), true);
  assert.deepEqual(evaluateServicesPhp(ast), { configurator: 1, loader: 1 });
});

test('comment-only ProductLoader in services.php does not count', () => {
  const ast = parsePhp(`<?php
// ProductLoader ContainerConfigurator
return static function (): void {};
`);
  assert.deepEqual(evaluateServicesPhp(ast), { configurator: 0, loader: 0 });
});

const eventHookTest = (body) => parsePhp(`<?php
final class ProductRestockNotifierTest extends TestCase
{
    public function testNotifyDispatchesRestockedEvent(): void
    {
${body}
    }
}
`);

test('event hook: unit test with an owned CollectingEventDispatcher passes', () => {
  const ast = eventHookTest(`
        $dispatcher = new CollectingEventDispatcher();
        $notifier = new ProductRestockNotifier($dispatcher, new NullLogger());
        $notifier->notify('p1', 5, Context::createDefaultContext());
        static::assertCount(1, $dispatcher->getEventsOfClass(ProductRestockedEvent::class));
`);
  assert.equal(evaluateEventHook([ast]).score, 1);
});

test('event hook: unit test with a mock expectation on dispatch passes', () => {
  const ast = eventHookTest(`
        $dispatcher = $this->createMock(EventDispatcherInterface::class);
        $dispatcher->expects(static::once())->method('dispatch')
            ->with(static::callback(fn (ProductRestockedEvent $e): bool => $e->productId === 'p1'));
        $notifier = new ProductRestockNotifier($dispatcher, new NullLogger());
        $notifier->notify('p1', 5, Context::createDefaultContext());
`);
  assert.equal(evaluateEventHook([ast]).score, 1);
});

test('event hook: addListener on the shared event_dispatcher fails', () => {
  const ast = eventHookTest(`
        $restocked = null;
        $dispatcher = static::getContainer()->get('event_dispatcher');
        $dispatcher->addListener(ProductRestockedEvent::class, function ($e) use (&$restocked): void { $restocked = $e; });
        static::getContainer()->get(ProductRestockNotifier::class)->notify('p1', 5, Context::createDefaultContext());
        static::assertNotNull($restocked);
`);
  const result = evaluateEventHook([ast]);
  assert.equal(result.score, 0);
  assert.match(result.detail, /shared_listener=1/);
});

test('event hook: inline container lookup with addListener fails', () => {
  const ast = eventHookTest(`
        $restocked = null;
        static::getContainer()->get(EventDispatcherInterface::class)
            ->addListener(ProductRestockedEvent::class, function ($e) use (&$restocked): void { $restocked = $e; });
        static::getContainer()->get(ProductRestockNotifier::class)->notify('p1', 5, Context::createDefaultContext());
        static::assertNotNull($restocked);
`);
  assert.equal(evaluateEventHook([ast]).score, 0);
});

test('event hook: hook whose capture is never asserted fails', () => {
  const ast = eventHookTest(`
        $restocked = null;
        EventHookDispatcher::fromContainer(static::getContainer())->on(ProductRestockedEvent::class, function ($e) use (&$restocked): void { $restocked = $e; });
        static::getContainer()->get(ProductRestockNotifier::class)->notify('p1', 5, Context::createDefaultContext());
        static::assertTrue(true);
`);
  assert.equal(evaluateEventHook([ast]).score, 0);
});

test('event hook: assertion inside an arrow function hook fails', () => {
  const ast = eventHookTest(`
        $restocked = null;
        $hooks = EventHookDispatcher::fromContainer(static::getContainer());
        $hooks->on(ProductRestockedEvent::class, function ($e) use (&$restocked): void { $restocked = $e; });
        $hooks->on(ProductRestockedEvent::class, fn ($e) => static::assertSame('p1', $e->productId));
        static::getContainer()->get(ProductRestockNotifier::class)->notify('p1', 5, Context::createDefaultContext());
        static::assertNotNull($restocked);
`);
  const result = evaluateEventHook([ast]);
  assert.equal(result.score, 0);
  assert.match(result.detail, /assert_in_hook=1/);
});

test('event hook: commented-out assertion inside the hook still passes', () => {
  const ast = eventHookTest(`
        $restocked = null;
        EventHookDispatcher::fromContainer(static::getContainer())->on(ProductRestockedEvent::class, function ($e) use (&$restocked): void {
            // static::assertSame('p1', $e->productId);
            $restocked = $e;
        });
        static::getContainer()->get(ProductRestockNotifier::class)->notify('p1', 5, Context::createDefaultContext());
        static::assertSame('p1', $restocked?->productId);
`);
  assert.equal(evaluateEventHook([ast]).score, 1);
});
