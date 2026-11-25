<?php declare(strict_types=1);

namespace Swag\Loyalty\Mcp\Tool;

use Doctrine\DBAL\Connection;
use Mcp\Capability\Attribute\McpTool;
use Mcp\Capability\Attribute\Schema;
use Mcp\Schema\ToolAnnotations;
use Shopware\Core\Framework\Mcp\Attribute\McpToolGroup;
use Shopware\Core\Framework\Mcp\Attribute\McpToolRequires;
use Shopware\Core\Framework\Mcp\Context\McpContextProvider;
use Shopware\Core\Framework\Mcp\Result\McpToolError;
use Shopware\Core\Framework\Mcp\Result\McpToolResult;
use Shopware\Core\Framework\Mcp\Tool\McpToolResponse;
use Shopware\Core\Framework\Uuid\Uuid;

#[McpTool(
    name: 'swag-loyalty-adjust-points',
    title: 'Adjust Loyalty Points',
    annotations: new ToolAnnotations(readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false),
    description: 'Add or subtract loyalty points for a customer.',
)]
#[McpToolGroup('swag-loyalty', description: 'Inspect and manage customer loyalty point balances.')]
#[McpToolRequires('swag_loyalty_points:update')]
class AdjustPointsTool extends McpToolResponse
{
    public function __construct(
        private readonly Connection $connection,
        private readonly McpContextProvider $contextProvider,
    ) {
    }

    public function __invoke(
        #[Schema(description: 'Customer UUID.')]
        string $customerId,
        #[Schema(description: 'Point delta to apply (positive or negative).')]
        int $delta,
    ): McpToolResult {
        $context = $this->contextProvider->getContext();
        $privilegeError = $this->requirePrivilegeResult($context, 'swag_loyalty_points:update');
        if ($privilegeError !== null) {
            return $privilegeError;
        }

        if ($delta === 0) {
            return $this->errorResult('Delta must be non-zero.', McpToolError::INVALID_ARGUMENTS);
        }

        $affected = $this->connection->executeStatement(
            'UPDATE swag_loyalty_points SET points = points + :delta WHERE customer_id = :customerId',
            ['delta' => $delta, 'customerId' => Uuid::fromHexToBytes($customerId)],
        );

        if ($affected === 0) {
            return $this->errorResult('Customer loyalty account not found.', McpToolError::NOT_FOUND);
        }

        return $this->successResult(['customerId' => $customerId, 'delta' => $delta]);
    }
}
