<?php declare(strict_types=1);

namespace Smoke\Fixture;

use PHPUnit\Framework\TestCase;
use Shopware\Core\Framework\Feature;

final class CartRoundingTest extends TestCase
{
    public function testSixEightRounding(): void
    {
        $this->assertFalse(Feature::isActive('v6.9.0.0'));
        $this->assertSame(1.99, (new CartRounding())->round(1.994));
    }
}
