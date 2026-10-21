<?php declare(strict_types=1);

namespace Swag\Loyalty\Points;

use Shopware\Core\Framework\Context;
use Shopware\Core\Framework\Log\Package;

#[Package('checkout')]
class PointsImporter
{
    public function __construct(
        private readonly PointsLedger $ledger,
        private readonly CustomerLookup $customers,
    ) {
    }

    /**
     * Books the points of each row and returns the new balance per customer.
     *
     * @param list<array{customerNumber: string, points: int}> $rows
     *
     * @return list<array{customerNumber: string, email: string, balance: int}>
     */
    public function import(array $rows, Context $context): array
    {
        $result = [];

        foreach ($rows as $row) {
            $customer = $this->customers->byNumber($row['customerNumber'], $context);
            $balance = $this->ledger->book($customer->getId(), $row['points'], 'erp-import', $context);

            $result[] = [
                'customerNumber' => $row['customerNumber'],
                'email' => $customer->getEmail(),
                'balance' => $balance,
            ];
        }

        return $result;
    }
}
