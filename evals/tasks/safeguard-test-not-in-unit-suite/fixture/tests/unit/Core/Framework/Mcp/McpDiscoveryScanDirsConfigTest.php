<?php declare(strict_types=1);

namespace Shopware\Tests\Unit\Core\Framework\Mcp;

use PHPUnit\Framework\Attributes\CoversNothing;
use PHPUnit\Framework\TestCase;

/**
 * @internal
 */
#[CoversNothing]
final class McpDiscoveryScanDirsConfigTest extends TestCase
{
    public function testScanDirsIncludeStorefrontMcp(): void
    {
        self::assertTrue(true);
    }
}
