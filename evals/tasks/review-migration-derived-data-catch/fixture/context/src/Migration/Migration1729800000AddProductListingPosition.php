<?php declare(strict_types=1);

namespace Swag\Listing\Migration;

use Doctrine\DBAL\Connection;
use Shopware\Core\Framework\Migration\MigrationStep;

class Migration1729800000AddProductListingPosition extends MigrationStep
{
    public function getCreationTimestamp(): int
    {
        return 1729800000;
    }

    public function update(Connection $connection): void
    {
        if ($this->columnExists($connection, 'swag_product_listing', 'position')) {
            return;
        }

        $connection->executeStatement(
            'ALTER TABLE `swag_product_listing` ADD COLUMN `position` INT NULL'
        );
    }
}
