<?php declare(strict_types=1);

namespace Smoke\Fixture;

use PHPUnit\Framework\Attributes\CoversClass;
use PHPUnit\Framework\TestCase;
use Shopware\Core\Framework\Test\TestCaseBase\IntegrationTestBehaviour;

#[CoversClass(ProductLoader::class)]
final class ProductLoaderIntegrationTest extends TestCase
{
    use IntegrationTestBehaviour;

    public function testLoadIdsReturnsExpectedShape(): void
    {
        $ids = (new ProductLoader())->loadIds();

        $this->assertSame(['p1', 'p2'], $ids);
    }
}
