<?php declare(strict_types=1);

namespace Smoke\Fixture;

final class PriceCalculator
{
    public function gross(float $net, float $taxRate): float
    {
        return round($net * (1.0 + $taxRate), 2);
    }
}
