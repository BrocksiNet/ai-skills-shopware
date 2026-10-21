<?php declare(strict_types=1);

namespace Swag\Loyalty\Service;

use Shopware\Core\Framework\Context;
use Shopware\Core\Framework\DataAbstractionLayer\EntityRepository;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Criteria;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Filter\RangeFilter;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Sorting\FieldSorting;
use Swag\Loyalty\Entity\LoyaltyTierEntity;

class LoyaltyTierResolver
{
    public function __construct(
        private readonly EntityRepository $tierRepository,
        private readonly LoyaltyPointsService $pointsService,
    ) {
    }

    public function resolve(string $customerId, Context $context): ?LoyaltyTierEntity
    {
        $criteria = new Criteria();
        $criteria->addFilter(new RangeFilter('minPoints', [
            RangeFilter::LTE => $this->pointsService->getBalance($customerId, $context),
        ]));
        $criteria->addSorting(new FieldSorting('minPoints', FieldSorting::DESCENDING));
        $criteria->setLimit(1);

        $tier = $this->tierRepository->search($criteria, $context)->first();

        return $tier instanceof LoyaltyTierEntity ? $tier : null;
    }
}
