<?php declare(strict_types=1);
namespace Swag\DeliveryTools\Migration;
use Doctrine\DBAL\Connection;
use Shopware\Core\Framework\Migration\MigrationStep;
final class Migration1783000000DeliveryZonePrivileges extends MigrationStep
{
    public function getCreationTimestamp(): int { return 1783000000; }
    public function update(Connection $connection): void
    {
        // Existing feature roles need the new entity privileges here.
    }
    public function updateDestructive(Connection $connection): void {}
}
