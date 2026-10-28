<?php declare(strict_types=1);

namespace Swag\OrderTools\Export;

use Shopware\Core\Checkout\Order\OrderEntity;

class OrderCsvExporter
{
    public function row(OrderEntity $order): array
    {
        return [
            $order->getOrderNumber(),
            number_format($order->getAmountTotal(), 2, ',', '.'),
            number_format($order->getShippingTotal(), 2, ',', '.'),
        ];
    }
}
