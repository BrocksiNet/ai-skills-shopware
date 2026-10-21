<?php declare(strict_types=1);

namespace Swag\Loyalty\Tier;

use Shopware\Core\Framework\Context;
use Swag\Loyalty\LoyaltyLedger;

class LoyaltyTierResolver
{
    public function __construct(private readonly LoyaltyLedger $ledger)
    {
    }

    public function resolve(string $customerId, Context $context): string
    {
        $points = $this->ledger->points($customerId, $context);

        return match (true) {
            $points >= 5000 => 'gold',
            $points >= 1000 => 'silver',
            default => 'bronze',
        };
    }
}
