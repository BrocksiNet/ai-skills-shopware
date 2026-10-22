<?php declare(strict_types=1);

namespace Swag\OrderExport\Service;

use Shopware\Core\Checkout\Order\OrderCollection;
use Shopware\Core\Framework\Context;
use Shopware\Core\Framework\DataAbstractionLayer\EntityRepository;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Criteria;

class OrderExporter
{
    /**
     * @param EntityRepository<OrderCollection> $orderRepository
     */
    public function __construct(
        private readonly EntityRepository $orderRepository,
        private readonly PaymentStatusResolver $paymentStatus,
    ) {
    }

    /**
     * @param list<string> $orderIds
     *
     * @return list<array{number: string|null, total: float, payment: string|null}>
     */
    public function export(array $orderIds, Context $context): array
    {
        $criteria = new Criteria($orderIds);
        $criteria->addAssociation('transactions.stateMachineState');

        $rows = [];
        foreach ($this->orderRepository->search($criteria, $context)->getEntities() as $order) {
            $rows[] = [
                'number' => $order->getOrderNumber(),
                'total' => $order->getAmountTotal(),
                'payment' => $this->paymentStatus->resolve($order),
            ];
        }

        return $rows;
    }
}
