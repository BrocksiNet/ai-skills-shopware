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
    name: 'swag-loyalty-points-lookup',
    title: 'Loyalty Points Lookup',
    annotations: new ToolAnnotations(readOnlyHint: true, openWorldHint: false),
    description: 'Look up the current loyalty point balance of a customer by ID.',
)]
#[McpToolGroup('swag-loyalty', description: 'Inspect and manage customer loyalty point balances.')]
#[McpToolRequires('swag_loyalty_points:read')]
class PointsLookupTool extends McpToolResponse
{
    public function __construct(
        private readonly Connection $connection,
        private readonly McpContextProvider $contextProvider,
    ) {
    }

    public function __invoke(
        #[Schema(description: 'Customer UUID to look up.')]
        string $customerId,
    ): McpToolResult {
        $context = $this->contextProvider->getContext();
        $privilegeError = $this->requirePrivilegeResult($context, 'swag_loyalty_points:read');
        if ($privilegeError !== null) {
            return $privilegeError;
        }

        $balance = $this->connection->fetchOne(
            'SELECT points FROM swag_loyalty_points WHERE customer_id = :customerId',
            ['customerId' => Uuid::fromHexToBytes($customerId)],
        );

        if ($balance === false) {
            return $this->errorResult(
                \sprintf('No loyalty account found for customer "%s".', $customerId),
                McpToolError::NOT_FOUND,
            );
        }

        return $this->successResult(['customerId' => $customerId, 'points' => (int) $balance]);
    }
}
