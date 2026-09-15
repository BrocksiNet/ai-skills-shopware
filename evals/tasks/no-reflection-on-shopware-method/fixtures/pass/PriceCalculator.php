<?php declare(strict_types=1);

namespace Smoke\Fixture;

final class PriceCalculator
{
    public function calculate(float $net): float
    {
        return $this->applyTax($net);
    }

    private function applyTax(float $net): float
    {
        return $net * 1.1;
    }
}
