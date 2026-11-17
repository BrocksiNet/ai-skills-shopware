<?php declare(strict_types=1);

namespace Acme\OrderProcessor;

use Shopware\Core\Checkout\Order\OrderDeliveryEntity;
use Shopware\Core\Framework\Context;
use Shopware\Core\Checkout\Order\OrderDeliveryCollection;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Criteria;

class DeliveryProcessor
{
    public function __construct(
        private readonly \Shopware\Core\Checkout\Order\OrderDeliveryRepository $deliveryRepository,
    ) {
    }

    public function processDeliveries(string $orderId, Context $context): void
    {
        $criteria = new Criteria();
        $criteria->addFilter(new \Shopware\Core\Framework\DataAbstractionLayer\Search\Filter\EqualsFilter('orderId', $orderId));
        
        $deliveries = $this->deliveryRepository->search($criteria, $context)->getEntities();
        
        foreach ($deliveries as $delivery) {
            $this->handleDelivery($delivery);
        }
    }

    private function handleDelivery(OrderDeliveryEntity $delivery): void
    {
        // Access positions without loading them
        $positionCount = \count($delivery->getPositions() ?? []);
        
        // Access state machine state without loading it
        if ($delivery->getStateMachineState()) {
            $state = $delivery->getStateMachineState()->getName();
        }
    }
}
