<?php declare(strict_types=1);

namespace Swag\Loyalty\Mcp\Tool;

use Mcp\Capability\Attribute\McpTool;
use Shopware\Core\Framework\DataAbstractionLayer\EntityRepository;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Criteria;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Filter\EqualsFilter;
use Shopware\Core\Framework\Log\Package;
use Shopware\Core\Framework\Mcp\Attribute\McpToolRequires;
use Shopware\Core\Framework\Mcp\Context\McpContextProvider;
use Shopware\Core\Framework\Mcp\Result\McpToolResult;
use Shopware\Core\Framework\Mcp\Tool\McpToolResponse;

#[Package('checkout')]
#[McpTool(
    name: 'swag-loyalty-points-balance',
    description: 'Read the loyalty points balance of one customer.'
)]
#[McpToolRequires('swag_loyalty_points:read')]
class PointsBalanceTool extends McpToolResponse
{
    /**
     * @internal
     */
    public function __construct(
        private readonly EntityRepository $pointsRepository,
        private readonly McpContextProvider $contextProvider,
    ) {
    }

    public function __invoke(string $customerId): McpToolResult
    {
        $context = $this->contextProvider->getContext();

        if ($error = $this->requirePrivilegeResult($context, 'swag_loyalty_points:read')) {
            return $error;
        }

        $criteria = new Criteria();
        $criteria->addFilter(new EqualsFilter('customerId', $customerId));
        $criteria->setLimit(1);

        $points = $this->pointsRepository->search($criteria, $context)->first();

        return $this->successResult(['customerId' => $customerId, 'points' => $points?->get('points') ?? 0]);
    }
}
