<?php declare(strict_types=1);

namespace Swag\ShopHealth\Check;

use Shopware\Core\System\SalesChannel\SalesChannelContext;

/**
 * Picks the category page the readiness check requests for a sales channel.
 */
class CategoryProbe
{
    /**
     * @param list<string> $candidateIds navigation children first, then the navigation root
     */
    public function pick(array $candidateIds, SalesChannelContext $context): ?string
    {
        return $candidateIds[0] ?? null;
    }
}
