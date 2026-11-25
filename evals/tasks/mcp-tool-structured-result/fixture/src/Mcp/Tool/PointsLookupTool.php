<?php declare(strict_types=1);

namespace Swag\Loyalty\Mcp\Tool;

use Doctrine\DBAL\Connection;
use Mcp\Capability\Attribute\McpTool;
use Mcp\Schema\ToolAnnotations;
use Shopware\Core\Framework\Mcp\Attribute\McpToolGroup;
use Shopware\Core\Framework\Mcp\Attribute\McpToolRequires;
use Shopware\Core\Framework\Mcp\Context\McpContextProvider;
use Shopware\Core\Framework\Uuid\Uuid;

#[McpTool(
    name: 'swag-loyalty-points-lookup',
    title: 'Loyalty Points Lookup',
    annotations: new ToolAnnotations(readOnlyHint: true, openWorldHint: false),
    description: 'Look up the current loyalty point balance of a customer by ID.',
)]
#[McpToolGroup('swag-loyalty', description: 'Inspect and manage customer loyalty point balances.')]
#[McpToolRequires('swag_loyalty_points:read')]
class PointsLookupTool
{
    public function __construct(
        private readonly Connection $connection,
        private readonly McpContextProvider $contextProvider,
    ) {
    }

    public function __invoke(string $customerId): string
    {
        $context = $this->contextProvider->getContext();
        if (!$context->isAllowed('swag_loyalty_points:read')) {
            return (string) json_encode([
                'success' => false,
                'error' => 'Missing privilege: swag_loyalty_points:read',
                'code' => 'missing_privilege',
            ]);
        }

        $balance = $this->connection->fetchOne(
            'SELECT points FROM swag_loyalty_points WHERE customer_id = :customerId',
            ['customerId' => Uuid::fromHexToBytes($customerId)],
        );

        if ($balance === false) {
            return (string) json_encode([
                'success' => false,
                'error' => \sprintf('No loyalty account found for customer "%s".', $customerId),
                'code' => 'not_found',
            ]);
        }

        return (string) json_encode([
            'success' => true,
            'data' => ['customerId' => $customerId, 'points' => (int) $balance],
        ]);
    }
}
