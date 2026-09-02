<?php declare(strict_types=1);

namespace Smoke\Fixture;

final class PriceCalculator
{
    /**
     * @codeCoverageIgnore
     */
    public function calculate(float $net): float
    {
        if ($net < 0) {
            throw new \InvalidArgumentException('net must be positive');
        }

        return $net * 1.1;
    }
}
