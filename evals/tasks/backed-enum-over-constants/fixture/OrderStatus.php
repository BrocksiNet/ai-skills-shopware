<?php declare(strict_types=1);

namespace Swag\Example\Order;

// Fixed value set modeled as class constants. Should become a backed enum.
class OrderStatus
{
    public const OPEN = 'open';
    public const PAID = 'paid';
    public const CANCELLED = 'cancelled';

    public static function all(): array
    {
        return [self::OPEN, self::PAID, self::CANCELLED];
    }
}
