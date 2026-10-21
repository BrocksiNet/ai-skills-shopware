<?php declare(strict_types=1);

namespace Swag\Loyalty\Service;

use Shopware\Core\Framework\Context;
use Shopware\Core\Framework\DataAbstractionLayer\EntityRepository;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Criteria;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Filter\EqualsFilter;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Filter\RangeFilter;

class LoyaltyPointsService
{
    public function __construct(
        private readonly EntityRepository $pointsTransactionRepository,
    ) {
    }

    /**
     * @return list<string> ids of customers with points expiring before $until
     */
    public function findCustomersWithExpiringPoints(\DateTimeImmutable $until, Context $context): array
    {
        $criteria = new Criteria();
        $criteria->addFilter(new EqualsFilter('reason', 'order'));
        $criteria->addFilter(new RangeFilter('expiresAt', [
            RangeFilter::GTE => (new \DateTimeImmutable())->format(\DATE_ATOM),
            RangeFilter::LTE => $until->format(\DATE_ATOM),
        ]));
        $criteria->setLimit(500);

        $ids = [];
        foreach ($this->pointsTransactionRepository->search($criteria, $context)->getEntities() as $transaction) {
            $ids[$transaction->get('customerId')] = true;
        }

        return array_keys($ids);
    }
}
