<?php declare(strict_types=1);

namespace Shopware\Tests\Integration\Core\Content\Product;

use PHPUnit\Framework\TestCase;
use Shopware\Core\Framework\Test\TestCaseBase\DatabaseTransactionBehaviour;
use Shopware\Core\Framework\Test\TestCaseBase\KernelTestBehaviour;

final class ProductRepositoryTest extends TestCase
{
    use KernelTestBehaviour;
    use DatabaseTransactionBehaviour;

    public function testCreateAndRead(): void
    {
        $repository = static::getContainer()->get('product.repository');
        static::assertNotNull($repository);
    }
}
