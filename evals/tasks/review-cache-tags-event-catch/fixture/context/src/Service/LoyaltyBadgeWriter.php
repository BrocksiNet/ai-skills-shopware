<?php declare(strict_types=1);

namespace Swag\Loyalty\Service;

use Shopware\Core\Framework\Context;
use Shopware\Core\Framework\DataAbstractionLayer\EntityRepository;

class LoyaltyBadgeWriter
{
    public function __construct(private readonly EntityRepository $badgeRepository)
    {
    }

    /**
     * @param list<array{productId: string, tier: string}> $badges
     */
    public function assign(array $badges, Context $context): void
    {
        $this->badgeRepository->upsert($badges, $context);
    }
}
