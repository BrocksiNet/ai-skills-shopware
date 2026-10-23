<?php declare(strict_types=1);

namespace Shopware\Tests\Integration\Core\Checkout\Cart;

use PHPUnit\Framework\Attributes\CoversClass;
use PHPUnit\Framework\TestCase;
use Shopware\Core\Checkout\Cart\CartNormalizer;
use Shopware\Core\Framework\Test\TestCaseBase\IntegrationTestBehaviour;

/**
 * @internal
 */
#[CoversClass(CartNormalizer::class)]
class CartNormalizerIntegrationTest extends TestCase
{
    use IntegrationTestBehaviour;

    public function testNormalizeReturnsTheCartAsArray(): void
    {
        $normalizer = $this->getContainer()->get(CartNormalizer::class);

        static::assertIsArray($normalizer->normalize($this->createCart()));
    }
}
