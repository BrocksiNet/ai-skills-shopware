<?php declare(strict_types=1);

namespace Shopware\Core\Framework\Telemetry;

use Shopware\Core\Framework\Log\Package;
use Shopware\Core\Framework\Util\Hasher;

/**
 * Anonymous instance id sent with every telemetry event, computed once per process.
 */
#[Package('framework')]
final class TelemetryInstanceId
{
    private static ?string $id = null;

    public static function get(): string
    {
        return self::$id ??= Hasher::hash((string) ($_SERVER['APP_URL'] ?? gethostname()));
    }
}
