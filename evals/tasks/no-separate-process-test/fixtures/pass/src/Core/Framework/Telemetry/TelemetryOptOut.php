<?php declare(strict_types=1);

namespace Shopware\Core\Framework\Telemetry;

use Shopware\Core\Framework\Log\Package;
use Symfony\Contracts\Service\ResetInterface;

/**
 * Decides once per process whether the shop opted out of usage telemetry.
 */
#[Package('framework')]
final class TelemetryOptOut implements ResetInterface
{
    private const VARIABLE = 'SHOPWARE_TELEMETRY_OPT_OUT';

    private static ?bool $optedOut = null;

    public static function isOptedOut(): bool
    {
        if (self::$optedOut === null) {
            $value = $_SERVER[self::VARIABLE] ?? getenv(self::VARIABLE);
            self::$optedOut = \in_array(strtolower((string) $value), ['1', 'true', 'yes'], true);
        }

        return self::$optedOut;
    }

    public function reset(): void
    {
        self::$optedOut = null;
    }
}
