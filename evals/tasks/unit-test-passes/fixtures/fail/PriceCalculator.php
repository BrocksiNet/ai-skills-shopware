<?php declare(strict_types=1);

namespace Swag\Example\Price;

final class PriceCalculator
{
    public function gross(float $net, float $taxRate): float
    {
        return round($net * (1 + $taxRate), 2);
    }
}
