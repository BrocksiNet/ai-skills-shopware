<?php declare(strict_types=1);

namespace Swag\Loyalty\Loyalty;

use Shopware\Core\System\SystemConfig\SystemConfigService;

class LoyaltyConfigReader
{
    public function __construct(private readonly SystemConfigService $systemConfig)
    {
    }

    public function pointsPerEuro(string $salesChannelId): float
    {
        return $this->systemConfig->getFloat('SwagLoyalty.config.pointsPerEuro', $salesChannelId);
    }

    public function tierThresholds(string $salesChannelId): array
    {
        return (array) $this->systemConfig->get('SwagLoyalty.config.tierThresholds', $salesChannelId);
    }
}
