<?php declare(strict_types=1);

namespace Shopware\Tests\Integration\Core\Checkout\Cart;

use PHPUnit\Framework\TestCase;
use Shopware\Core\Checkout\Cart\Cart;
use Shopware\Core\Checkout\Cart\CartNormalizer;
use Shopware\Core\Framework\Test\TestCaseBase\IntegrationTestBehaviour;

/**
 * @internal
 */
class CartNormalizerIntegrationTest extends TestCase
{
    use IntegrationTestBehaviour;

    public function testNormalizeAddsTheProductNumbersFromTheDatabase(): void
    {
        $normalizer = $this->getContainer()->get(CartNormalizer::class);

        $data = $normalizer->normalize(new Cart('test-token'));

        static::assertSame([], $data['productNumbers']);
    }
}
