<?php declare(strict_types=1);

namespace Swag\Restock\Tests\Integration;

use PHPUnit\Framework\TestCase;
use Shopware\Core\Framework\Context;
use Shopware\Core\Framework\Test\TestCaseBase\IntegrationTestBehaviour;
use Shopware\Core\Framework\Uuid\Uuid;
use Shopware\Core\Test\Integration\EventDispatcher\EventHookDispatcher;
use Swag\Restock\ProductRestockedEvent;
use Swag\Restock\ProductRestockNotifier;

/**
 * @internal
 */
class ProductRestockNotifierTest extends TestCase
{
    use IntegrationTestBehaviour;

    public function testNotifyDispatchesRestockedEvent(): void
    {
        $productId = Uuid::randomHex();
        $restocked = null;

        EventHookDispatcher::fromContainer(static::getContainer())->on(
            ProductRestockedEvent::class,
            function (ProductRestockedEvent $event) use (&$restocked): void {
                $restocked = $event;
            },
        );

        static::getContainer()->get(ProductRestockNotifier::class)
            ->notify($productId, 5, Context::createDefaultContext());

        static::assertNotNull($restocked);
        static::assertSame($productId, $restocked->productId);
    }
}
