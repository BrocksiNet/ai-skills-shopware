<?php declare(strict_types=1);

namespace Swag\OrderTools\Shipping;

use Shopware\Core\Checkout\Order\OrderEntity;

class ShippingCostResolver
{
    public function resolve(OrderEntity $order): float
    {
        return $order->getDeliveries()->first()->getShippingCosts()->getTotalPrice();
    }
}
