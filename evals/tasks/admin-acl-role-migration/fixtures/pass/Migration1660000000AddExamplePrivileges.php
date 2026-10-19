<?php declare(strict_types=1);

namespace Swag\Example\Migration;

use Doctrine\DBAL\Connection;
use Shopware\Core\Framework\Migration\MigrationStep;

final class Migration1660000000AddExamplePrivileges extends MigrationStep
{
    private const NEW_PRIVILEGES = [
        'swag_example.viewer' => [
            'product:read',
        ],
    ];

    public function getCreationTimestamp(): int
    {
        return 1660000000;
    }

    public function update(Connection $connection): void
    {
        $this->addAdditionalPrivileges($connection, self::NEW_PRIVILEGES);
    }
}
