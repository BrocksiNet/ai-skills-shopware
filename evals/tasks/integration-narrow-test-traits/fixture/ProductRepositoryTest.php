<?php declare(strict_types=1);

namespace Shopware\Tests\Integration\Core\Content\Product;

use PHPUnit\Framework\TestCase;
use Shopware\Core\Framework\Test\TestCaseBase\IntegrationTestBehaviour;

final class ProductRepositoryTest extends TestCase
{
    use IntegrationTestBehaviour;

    public function testCreateAndRead(): void
    {
        $repository = static::getContainer()->get('product.repository');
        static::assertNotNull($repository);
    }
}
