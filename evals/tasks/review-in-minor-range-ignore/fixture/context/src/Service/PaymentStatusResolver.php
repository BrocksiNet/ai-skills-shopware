<?php declare(strict_types=1);

namespace Swag\OrderExport\Service;

use Shopware\Core\Checkout\Order\Aggregate\OrderTransaction\OrderTransactionEntity;
use Shopware\Core\Checkout\Order\OrderEntity;

class PaymentStatusResolver
{
    public function resolve(OrderEntity $order): ?string
    {
        return $this->latestTransaction($order)?->getStateMachineState()?->getTechnicalName();
    }

    private function latestTransaction(OrderEntity $order): ?OrderTransactionEntity
    {
        $transactions = $order->getTransactions();
        if ($transactions === null) {
            return null;
        }

        $transactions->sort(
            static fn (OrderTransactionEntity $a, OrderTransactionEntity $b): int => $a->getCreatedAt() <=> $b->getCreatedAt()
        );

        return $transactions->last();
    }
}
