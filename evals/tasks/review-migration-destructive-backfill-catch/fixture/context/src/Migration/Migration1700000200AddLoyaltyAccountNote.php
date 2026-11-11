<?php declare(strict_types=1);

namespace Swag\Loyalty\Migration;

use Doctrine\DBAL\Connection;
use Shopware\Core\Framework\Migration\MigrationStep;

class Migration1700000200AddLoyaltyAccountNote extends MigrationStep
{
    public function getCreationTimestamp(): int
    {
        return 1700000200;
    }

    public function update(Connection $connection): void
    {
        if ($this->columnExists($connection, 'swag_loyalty_account', 'note')) {
            return;
        }

        $connection->executeStatement(
            'ALTER TABLE `swag_loyalty_account` ADD COLUMN `note` VARCHAR(255) NULL'
        );
    }
}
