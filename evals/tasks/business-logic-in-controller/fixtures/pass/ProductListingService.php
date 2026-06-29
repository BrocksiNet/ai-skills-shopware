<?php declare(strict_types=1);

namespace Smoke\Fixture;

use Shopware\Core\Framework\DataAbstractionLayer\EntityRepository;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Criteria;
use Shopware\Core\Framework\Context;

final class ProductListingService
{
    public function __construct(
        private readonly EntityRepository $productRepository,
        private readonly Context $context,
    ) {
    }

    /**
     * @return list<string>
     */
    public function listProductIds(): array
    {
        $criteria = new Criteria();
        $criteria->setLimit(25);

        return $this->productRepository->search($criteria, $this->context)->getIds();
    }
}
