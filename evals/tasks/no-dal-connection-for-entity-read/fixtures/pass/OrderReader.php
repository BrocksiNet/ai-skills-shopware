<?php declare(strict_types=1);

namespace Smoke\Fixture;

use Shopware\Core\Framework\DataAbstractionLayer\EntityRepository;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Criteria;
use Shopware\Core\Framework\Context;

final class OrderReader
{
    /**
     * @param EntityRepository $orderRepository
     */
    public function __construct(
        private readonly EntityRepository $orderRepository,
    ) {
    }

    /**
     * @return list<string>
     */
    public function loadOrderIds(Context $context): array
    {
        $criteria = new Criteria();
        $criteria->setLimit(50);

        return $this->orderRepository->search($criteria, $context)->getIds();
    }
}
