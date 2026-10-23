<?php declare(strict_types=1);

namespace Swag\Loyalty\Service;

/**
 * Loyalty points a customer earns for an order total: one point per 10 units.
 */
class LoyaltyCalculator
{
    private const UNITS_PER_POINT = 10;

    public function points(float $total): int
    {
        if ($total <= 0.0) {
            return 0;
        }

        return (int) floor($total / self::UNITS_PER_POINT);
    }
}
