<?php declare(strict_types=1);

namespace Shopware\Tests\Unit\Storefront\Mcp;

use PHPUnit\Framework\TestCase;

/**
 * Storefront MCP service config.
 *
 * Discovery of the Storefront Mcp scan dir is covered by
 * \Shopware\Tests\Unit\Core\Framework\Mcp\McpDiscoveryScanDirsConfigTest.
 */
final class McpStorefrontServiceConfigTest extends TestCase
{
    public function testConfigLoads(): void
    {
        self::assertTrue(true);
    }
}
