<?php declare(strict_types=1);

namespace Swag\Loyalty\Points;

use Shopware\Core\Framework\Context;
use Shopware\Core\Framework\Log\Package;

#[Package('checkout')]
class PointsCalculator
{
    public function __construct(private readonly PointsLedger $ledger)
    {
    }

    public function balance(string $customerId, Context $context): int
    {
        return $this->ledger->sum($customerId, $context);
    }

    /**
     * @return list<array{date: \DateTimeImmutable, points: int, reason: string}>
     */
    public function history(string $customerId, Context $context, int $limit = 20): array
    {
        return $this->ledger->latest($customerId, $context, $limit);
    }
}
