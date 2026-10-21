<?php declare(strict_types=1);

namespace Swag\Loyalty;

use Shopware\Core\Framework\Context;

final class LoyaltyTierChangedEvent
{
    public function __construct(
        public readonly string $customerId,
        public readonly string $previousTier,
        public readonly string $tier,
        public readonly Context $context,
    ) {
    }
}
