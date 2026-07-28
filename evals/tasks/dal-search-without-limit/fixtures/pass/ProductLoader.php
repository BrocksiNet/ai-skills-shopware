<?php declare(strict_types=1);

namespace Smoke\Fixture;

use Shopware\Core\Framework\DataAbstractionLayer\EntityRepository;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Criteria;
use Shopware\Core\Framework\Context;

final class ProductLoader
{
    /**
     * @param EntityRepository $productRepository
     */
    public function __construct(
        private readonly EntityRepository $productRepository,
    ) {
    }

    public function loadAll(Context $context): array
    {
        $criteria = new Criteria();
        $criteria->setLimit(50);

        return $this->productRepository->search($criteria, $context)->getIds();
    }
}
