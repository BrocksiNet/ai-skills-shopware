<?php declare(strict_types=1);

namespace Shopware\Tests\Unit\Core\Framework\Telemetry;

use PHPUnit\Framework\Attributes\CoversClass;
use PHPUnit\Framework\Attributes\RunInSeparateProcess;
use PHPUnit\Framework\TestCase;
use Shopware\Core\Framework\Log\Package;
use Shopware\Core\Framework\Telemetry\TelemetryInstanceId;
use Shopware\Core\Framework\Util\Hasher;

/**
 * @internal
 */
#[Package('framework')]
#[CoversClass(TelemetryInstanceId::class)]
class TelemetryInstanceIdTest extends TestCase
{
    #[RunInSeparateProcess]
    public function testIdIsHashOfAppUrl(): void
    {
        $_SERVER['APP_URL'] = 'https://shop.example';

        static::assertSame(Hasher::hash('https://shop.example'), TelemetryInstanceId::get());
    }

    #[RunInSeparateProcess]
    public function testIdIsComputedOncePerProcess(): void
    {
        $_SERVER['APP_URL'] = 'https://first.example';
        $first = TelemetryInstanceId::get();
        $_SERVER['APP_URL'] = 'https://second.example';

        static::assertSame($first, TelemetryInstanceId::get());
    }
}
