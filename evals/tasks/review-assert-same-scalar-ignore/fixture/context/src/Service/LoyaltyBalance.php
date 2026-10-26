<?php declare(strict_types=1);

namespace Swag\Loyalty\Service;

class LoyaltyBalance
{
    public function __construct(private readonly PointsLedger $ledger)
    {
    }

    public function forCustomer(string $customerId): int
    {
        return (int) $this->ledger->sumFor($customerId);
    }
}
