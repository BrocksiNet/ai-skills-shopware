<?php declare(strict_types=1);

namespace Smoke\Fixture;

use PHPUnit\Framework\Attributes\CoversClass;
use PHPUnit\Framework\TestCase;
use Shopware\Core\Framework\Log\Package;

#[Package('checkout.cart')]
#[CoversClass(CartNormalizer::class)]
final class CartNormalizerTest extends TestCase
{
    /**
     * @internal
     */
    private function helperId(): string
    {
        return 'line-1';
    }

    public function testNormalizeReturnsIdShape(): void
    {
        $result = (new CartNormalizer())->normalize($this->helperId());

        $this->assertSame(['id' => 'line-1'], $result);
    }
}
