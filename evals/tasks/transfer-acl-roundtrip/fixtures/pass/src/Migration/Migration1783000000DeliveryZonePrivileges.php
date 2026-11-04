<?php declare(strict_types=1);
namespace Swag\DeliveryTools\Migration;
use Doctrine\DBAL\Connection;
use Shopware\Core\Framework\Migration\MigrationStep;
final class Migration1783000000DeliveryZonePrivileges extends MigrationStep
{
    public function getCreationTimestamp(): int { return 1783000000; }
    public function update(Connection $connection): void
    {
        $this->addAdditionalPrivileges($connection, [
            'swag_delivery_zone.viewer' => ['swag_delivery_zone:read'],
            'swag_delivery_zone.editor' => ['swag_delivery_zone:read', 'swag_delivery_zone:update'],
            'swag_delivery_zone.creator' => ['swag_delivery_zone:read', 'swag_delivery_zone:update', 'swag_delivery_zone:create'],
            'swag_delivery_zone.deleter' => ['swag_delivery_zone:read', 'swag_delivery_zone:delete'],
        ]);
    }
    public function updateDestructive(Connection $connection): void {}
}
