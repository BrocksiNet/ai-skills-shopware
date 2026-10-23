<?php declare(strict_types=1);

namespace Swag\Loyalty\Tests\Unit\Service;

use PHPUnit\Framework\Attributes\CoversClass;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Swag\Loyalty\Service\LoyaltyCalculator;

/**
 * @internal
 */
#[CoversClass(LoyaltyCalculator::class)]
class LoyaltyCalculatorTest extends TestCase
{
    #[DataProvider('totals')]
    public function testPointsForTotal(float $total, int $expected): void
    {
        static::assertSame($expected, (new LoyaltyCalculator())->points($total));
    }

    public static function totals(): \Generator
    {
        yield 'zero total' => [0.0, 0];
        yield 'negative total' => [-5.0, 0];
        yield 'exactly one point' => [10.0, 1];
        yield 'rounds down below the next point' => [19.99, 1];
    }
}
