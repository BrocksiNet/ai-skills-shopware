<?php declare(strict_types=1);

namespace Smoke\Fixture;

final class CartRounding
{
    public function round(float $value): float
    {
        return round($value, 2);
    }
}
