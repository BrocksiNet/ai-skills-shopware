<?php declare(strict_types=1);

namespace Smoke\Fixture;

use PHPUnit\Framework\Attributes\CoversClass;
use PHPUnit\Framework\TestCase;
use ReflectionMethod;
use Shopware\Core\Framework\Log\Package;

/**
 * @internal
 */
#[Package('checkout.cart')]
#[CoversClass(PriceCalculator::class)]
final class PriceCalculatorTest extends TestCase
{
    public function testApplyTaxViaReflection(): void
    {
        $method = new ReflectionMethod(PriceCalculator::class, 'applyTax');
        $method->setAccessible(true);

        $result = $method->invoke(new PriceCalculator(), 10.0);

        $this->assertSame(11.0, $result);
    }
}
