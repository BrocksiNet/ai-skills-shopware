<?php declare(strict_types=1);

namespace Shopware\Core\Checkout\Cart\Price;

use Shopware\Core\Framework\Log\Package;

#[Package('checkout')]
class RoundingCalculator
{
    public function round(float $value, int $precision, bool $legacyHalfUp = false): float
    {
        if ($legacyHalfUp) {
            return $this->roundLegacyHalfUp($value, $precision);
        }

        return round($value, $precision, \PHP_ROUND_HALF_EVEN);
    }

    private function roundLegacyHalfUp(float $value, int $precision): float
    {
        $factor = 10 ** $precision;

        return floor($value * $factor + 0.5) / $factor;
    }
}
