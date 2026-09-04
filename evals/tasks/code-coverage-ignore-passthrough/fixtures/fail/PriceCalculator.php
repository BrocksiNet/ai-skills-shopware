<?php declare(strict_types=1);

namespace Smoke\Fixture;

final class PriceCalculator
{
    public function calculate(float $net): float
    {
        return $net * 1.1;
    }

    private function guard(float $net): void
    {
        if ($net < 0) {
            throw new \InvalidArgumentException('net must be positive');
        }
    }
}
