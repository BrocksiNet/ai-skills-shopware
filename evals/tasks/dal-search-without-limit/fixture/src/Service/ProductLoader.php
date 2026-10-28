<?php declare(strict_types=1);

namespace Swag\Example\Service;

use Shopware\Core\Framework\Context;
use Shopware\Core\Framework\DataAbstractionLayer\EntityRepository;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Criteria;

class ProductLoader
{
    public function __construct(
        private readonly EntityRepository $productRepository,
    ) {
    }

    /**
     * @return list<string>
     */
    public function loadAll(Context $context): array
    {
        $criteria = new Criteria();

        /** @var list<string> $ids */
        $ids = $this->productRepository->searchIds($criteria, $context)->getIds();

        return $ids;
    }
}
