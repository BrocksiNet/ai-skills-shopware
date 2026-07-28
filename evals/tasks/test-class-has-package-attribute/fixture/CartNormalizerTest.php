<?php declare(strict_types=1);

namespace Smoke\Fixture;

use PHPUnit\Framework\Attributes\CoversClass;
use PHPUnit\Framework\TestCase;

#[CoversClass(CartNormalizer::class)]
final class CartNormalizerTest extends TestCase
{
    public function testNormalizeReturnsIdShape(): void
    {
        $result = (new CartNormalizer())->normalize('line-1');

        $this->assertSame(['id' => 'line-1'], $result);
    }
}
