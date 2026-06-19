<?php declare(strict_types=1);

namespace Swag\Example\Price;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class PriceCalculatorTest extends TestCase
{
    #[DataProvider('grossCases')]
    public function testGross(float $net, float $taxRate, float $expected): void
    {
        $this->assertSame($expected, (new PriceCalculator())->gross($net, $taxRate));
    }

    public static function grossCases(): array
    {
        return [
            'standard 19%' => [100.0, 0.19, 119.0],
            'zero tax' => [50.0, 0.0, 50.0],
        ];
    }
}
