<?php declare(strict_types=1);

namespace Smoke\Fixture;

use PHPUnit\Framework\TestCase;
use Shopware\Core\Framework\Feature;
use Shopware\Core\Test\Annotation\DisabledFeatures;

// #[DisabledFeatures(['v6.9.0.0'])]
final class CartRoundingTest extends TestCase
{
    public function testSixEightRounding(): void
    {
        Feature::fake(['v6.8.0.0' => true]);
        $this->assertFalse(Feature::isActive('v6.9.0.0'));
        $this->assertSame(1.99, (new CartRounding())->round(1.994));
    }
}
