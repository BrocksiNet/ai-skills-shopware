<?php declare(strict_types=1);

namespace Swag\Loyalty;

use Shopware\Core\Framework\Context;
use Symfony\Contracts\EventDispatcher\EventDispatcherInterface;

class LoyaltyTierUpdater
{
    public function __construct(
        private readonly LoyaltyLedger $ledger,
        private readonly EventDispatcherInterface $dispatcher,
    ) {
    }

    public function update(string $customerId, Context $context): void
    {
        $previous = $this->ledger->tier($customerId, $context);
        $tier = $this->ledger->recalculateTier($customerId, $context);

        if ($tier !== $previous) {
            $this->dispatcher->dispatch(new LoyaltyTierChangedEvent($customerId, $previous, $tier, $context));
        }
    }
}
