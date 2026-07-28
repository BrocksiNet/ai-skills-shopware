<?php declare(strict_types=1);

namespace Smoke\Fixture;

use Doctrine\DBAL\Connection;
use Shopware\Core\Framework\Context;

final class OrderReader
{
    public function __construct(
        private readonly Connection $connection,
    ) {
    }

    /**
     * @return list<string>
     */
    public function loadOrderIds(Context $context): array
    {
        $rows = $this->connection->fetchAllAssociative(
            'SELECT LOWER(HEX(id)) AS id FROM `order` LIMIT 50'
        );

        return array_column($rows, 'id');
    }
}
