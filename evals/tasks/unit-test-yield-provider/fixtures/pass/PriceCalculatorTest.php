<?php declare(strict_types=1);

namespace Smoke\Fixture;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class PriceCalculatorTest extends TestCase
{
    #[DataProvider('grossCases')]
    public function testGross(float $net, float $taxRate, float $expected): void
    {
        $this->assertSame($expected, (new PriceCalculator())->gross($net, $taxRate));
    }

    public static function grossCases(): \Generator
    {
        yield 'standard 19 percent' => [100.0, 0.19, 119.0];
        yield 'zero tax' => [50.0, 0.0, 50.0];
    }
}
