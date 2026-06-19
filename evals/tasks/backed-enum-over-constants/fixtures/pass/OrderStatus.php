<?php declare(strict_types=1);

namespace Swag\Example\Order;

enum OrderStatus: string
{
    case Open = 'open';
    case Paid = 'paid';
    case Cancelled = 'cancelled';
}
