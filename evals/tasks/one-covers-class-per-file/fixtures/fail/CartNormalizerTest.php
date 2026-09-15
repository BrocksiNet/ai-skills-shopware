<?php declare(strict_types=1);

namespace Smoke\Fixture;

use PHPUnit\Framework\Attributes\CoversClass;
use PHPUnit\Framework\TestCase;
use Shopware\Core\Framework\Log\Package;

/**
 * @internal
 */
#[Package('checkout.cart')]
#[CoversClass(CartNormalizer::class)]
final class CartNormalizerTest extends TestCase
{
    public function testNormalizeReturnsIdShape(): void
    {
        $result = (new CartNormalizer())->normalize('line-1');

        $this->assertSame(['id' => 'line-1'], $result);
    }
}

/**
 * @internal
 */
#[Package('checkout.cart')]
#[CoversClass(LineItemHelper::class)]
final class LineItemHelperTest extends TestCase
{
    public function testHelperExists(): void
    {
        $this->assertTrue(class_exists(LineItemHelper::class));
    }
}
