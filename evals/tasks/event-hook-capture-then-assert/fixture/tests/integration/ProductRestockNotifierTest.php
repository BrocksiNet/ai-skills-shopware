<?php declare(strict_types=1);

namespace Swag\Restock\Tests\Integration;

use PHPUnit\Framework\TestCase;
use Shopware\Core\Framework\Test\TestCaseBase\IntegrationTestBehaviour;

/**
 * @internal
 */
class ProductRestockNotifierTest extends TestCase
{
    use IntegrationTestBehaviour;

    public function testNotifyDispatchesRestockedEvent(): void
    {
    }
}
