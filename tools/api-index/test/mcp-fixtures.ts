export const COMPILER_PASS = `<?php declare(strict_types=1);
namespace Shopware\\Core\\Framework\\DependencyInjection\\CompilerPass;

/** @experimental stableVersion:v6.8.0 */
class McpToolDiscoveryCompilerPass
{
    private const BUNDLE_KIND_TAGS = [
        'tools' => 'mcp.tool',
        'resource_templates' => 'mcp.resource_template',
    ];

    public function process(): void
    {
        $tagMapping = [
            'shopware.mcp.tool' => 'mcp.tool',
            'shopware.mcp.prompt' => 'mcp.prompt',
            'shopware.store_api_mcp.tool' => 'mcp.tool',
        ];
    }
}
`;

const DI_MCP = `<?php declare(strict_types=1);
return static function ($container): void {
    $container->services()->set('loader')->tag('mcp.loader');
};
`;

export const ATTRIBUTE_GROUP = `<?php declare(strict_types=1);
namespace Shopware\\Core\\Framework\\Mcp\\Attribute;

/** @experimental stableVersion:v6.8.0 */
#[\\Attribute(\\Attribute::TARGET_CLASS | \\Attribute::TARGET_METHOD)]
final readonly class McpToolGroup
{
    public function __construct(public string $group, public ?string $description = null) {}
}
`;

export const CONTEXT_INTERFACE = `<?php declare(strict_types=1);
namespace Shopware\\Core\\Framework\\Mcp\\Context;

use Shopware\\Core\\Framework\\Context;

/** @experimental stableVersion:v6.8.0 */
interface McpContextProviderInterface
{
    public function getContext(): Context;
}
`;

const INTERNAL_CONTEXT = `<?php declare(strict_types=1);
namespace Shopware\\Core\\Framework\\Mcp\\Context;

/** @internal */
class StoreApiMcpContextProvider implements McpContextProviderInterface
{
    public function getContext(): Context {}
}
`;

export const BASE_TOOL = `<?php declare(strict_types=1);
namespace Shopware\\Core\\Framework\\Mcp\\Tool;

/** @experimental stableVersion:v6.8.0 */
abstract class McpToolResponse
{
    protected function successResult(mixed $data): void {}
}
`;

const INCLUDES_TRAIT = `<?php declare(strict_types=1);
namespace Shopware\\Core\\Framework\\Mcp\\Tool;

trait McpEntityIncludes {}
`;

const CONCRETE_TOOL = `<?php declare(strict_types=1);
namespace Shopware\\Core\\Framework\\Mcp\\Tool;

class EntitySearchTool extends McpToolResponse {}
`;

export const CORE_MCP_FILES = new Map<string, string>([
  ['src/Core/Framework/DependencyInjection/CompilerPass/McpToolDiscoveryCompilerPass.php', COMPILER_PASS],
  ['src/Core/Framework/DependencyInjection/mcp.php', DI_MCP],
  ['src/Core/Framework/Mcp/Attribute/McpToolGroup.php', ATTRIBUTE_GROUP],
  ['src/Core/Framework/Mcp/Context/McpContextProviderInterface.php', CONTEXT_INTERFACE],
  ['src/Core/Framework/Mcp/Context/StoreApiMcpContextProvider.php', INTERNAL_CONTEXT],
  ['src/Core/Framework/Mcp/Tool/McpToolResponse.php', BASE_TOOL],
  ['src/Core/Framework/Mcp/Tool/McpEntityIncludes.php', INCLUDES_TRAIT],
  ['src/Core/Framework/Mcp/Tool/EntitySearchTool.php', CONCRETE_TOOL],
]);
