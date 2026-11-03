<?php declare(strict_types=1);

namespace Shopware\Tests\Unit\Core\Framework\Telemetry;

use PHPUnit\Framework\Attributes\CoversClass;
use PHPUnit\Framework\TestCase;
use Shopware\Core\Framework\Log\Package;
use Shopware\Core\Framework\Telemetry\TelemetryOptOut;

/**
 * @internal
 */
#[Package('framework')]
#[CoversClass(TelemetryOptOut::class)]
class TelemetryOptOutTest extends TestCase
{
    private const VARIABLE = 'SHOPWARE_TELEMETRY_OPT_OUT';

    protected function setUp(): void
    {
        (new TelemetryOptOut())->reset();
    }

    protected function tearDown(): void
    {
        unset($_SERVER[self::VARIABLE]);
        putenv(self::VARIABLE);
        (new TelemetryOptOut())->reset();
    }

    public function testNotOptedOutWithoutVariable(): void
    {
        static::assertFalse(TelemetryOptOut::isOptedOut());
    }

    public function testOptedOutFromProcessEnvironment(): void
    {
        putenv(self::VARIABLE . '=1');

        static::assertTrue(TelemetryOptOut::isOptedOut());
    }

    public function testOptedOutFromServerVariable(): void
    {
        $_SERVER[self::VARIABLE] = 'true';

        static::assertTrue(TelemetryOptOut::isOptedOut());
    }
}
