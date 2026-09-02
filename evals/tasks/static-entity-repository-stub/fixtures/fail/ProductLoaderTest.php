<?php declare(strict_types=1);

namespace Smoke\Fixture;

use PHPUnit\Framework\Attributes\CoversClass;
use PHPUnit\Framework\TestCase;
use Shopware\Core\Content\Product\ProductCollection;
use Shopware\Core\Framework\Context;
use Shopware\Core\Framework\DataAbstractionLayer\EntityRepository;
use Shopware\Core\Framework\Log\Package;
use Shopware\Core\Test\Stub\DataAbstractionLayer\StaticEntityRepository;

/**
 * @internal
 */
#[Package('inventory')]
#[CoversClass(ProductLoader::class)]
final class ProductLoaderTest extends TestCase
{
    public function testLoadReturnsTag(): void
    {
        $repository = $this->createMock(EntityRepository::class);
        StaticEntityRepository::of(ProductCollection::class, []);
        $loader = new ProductLoader($repository);

        $this->assertSame('swag-example-product-a', $loader->load('a', Context::createDefaultContext()));
    }
}
