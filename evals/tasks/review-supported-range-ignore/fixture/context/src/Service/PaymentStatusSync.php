<?php declare(strict_types=1);

namespace Swag\PaymentSync\Service;

use Shopware\Core\Checkout\Order\Aggregate\OrderTransaction\OrderTransactionStateHandler;
use Shopware\Core\Framework\Context;

class PaymentStatusSync
{
    public function __construct(private readonly OrderTransactionStateHandler $stateHandler)
    {
    }

    /**
     * Moves the order transaction to the state the payment provider reported.
     */
    public function apply(string $transactionId, string $providerStatus, Context $context): void
    {
        match ($providerStatus) {
            'authorized' => $this->stateHandler->authorize($transactionId, $context),
            'captured' => $this->stateHandler->paid($transactionId, $context),
            'partially_captured' => $this->stateHandler->payPartially($transactionId, $context),
            'refunded' => $this->stateHandler->refund($transactionId, $context),
            'cancelled' => $this->stateHandler->cancel($transactionId, $context),
            default => null,
        };
    }
}
