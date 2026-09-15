<?php declare(strict_types=1);

namespace Swag\Example\Migration;

use Doctrine\DBAL\Connection;
use Shopware\Core\Framework\Migration\MigrationStep;

final class Migration1660000000AddExamplePrivileges extends MigrationStep
{
    public function getCreationTimestamp(): int
    {
        return 1660000000;
    }

    public function update(Connection $connection): void
    {
        $connection->executeStatement(
            <<<'SQL'
UPDATE acl_role
SET privileges = JSON_ARRAY_APPEND(privileges, '$', :privilege)
WHERE JSON_CONTAINS(privileges, JSON_QUOTE('swag_example.viewer'))
  AND NOT JSON_CONTAINS(privileges, JSON_QUOTE('product:read'))
SQL,
            ['privilege' => 'product:read']
        );
    }
}
