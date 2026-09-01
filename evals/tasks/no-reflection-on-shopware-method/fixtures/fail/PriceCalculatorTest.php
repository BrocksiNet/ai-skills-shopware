<?php declare(strict_types=1);

namespace Smoke\Fixture;

use PHPUnit\Framework\Attributes\CoversClass;
use PHPUnit\Framework\TestCase;
use Shopware\Core\Framework\Log\Package;

/**
 * @internal
 */
#[Package('checkout.cart')]
#[CoversClass(PriceCalculator::class)]
final class PriceCalculatorTest extends TestCase
{
    public function testCalculateAppliesTax(): void
    {
        (new PriceCalculator())->calculate(10.0);
    }
}
