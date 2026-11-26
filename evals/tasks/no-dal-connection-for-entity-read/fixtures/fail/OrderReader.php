<?php declare(strict_types=1);

namespace Smoke\Fixture;

use Shopware\Core\Framework\Context;
use Shopware\Core\Framework\DataAbstractionLayer\EntityRepository;

final class OrderReader
{
    public function __construct(
        private readonly object $connection,
    ) {
    }

    /**
     * @return list<string>
     */
    public function loadOrderIds(Context $context): array
    {
        // TODO: switch to EntityRepository::search()
        return $this->connection->executeQuery('SELECT LOWER(HEX(id)) FROM `order` LIMIT 50')->fetchFirstColumn();
    }
}
