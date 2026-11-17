<?php declare(strict_types=1);

namespace Swag\Loyalty\Loyalty;

use Shopware\Core\System\SystemConfig\SystemConfigService;

class LoyaltyConfigReader
{
    private const KEYS = ['SwagLoyalty.config.pointsPerEuro', 'SwagLoyalty.config.tierThresholds'];

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

    /**
     * Drops the sales channel's own loyalty settings so it falls back to the
     * global values. Called by the "Reset to defaults" button in the Administration.
     */
    public function reset(string $salesChannelId): void
    {
        foreach (self::KEYS as $key) {
            $this->systemConfig->delete($key, $salesChannelId);
        }
    }
}
