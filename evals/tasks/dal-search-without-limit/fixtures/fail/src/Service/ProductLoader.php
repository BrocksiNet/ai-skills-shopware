<?php declare(strict_types=1);

namespace Swag\Example\Service;

use Shopware\Core\Framework\Context;
use Shopware\Core\Framework\DataAbstractionLayer\EntityRepository;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Criteria;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Filter\EqualsFilter;

class ProductLoader
{
    public function __construct(
        private readonly EntityRepository $productRepository,
    ) {
    }

    /**
     * @return list<string>
     */
    public function loadForCategory(string $categoryId, Context $context): array
    {
        $criteria = new Criteria();
        $criteria->addFilter(new EqualsFilter('categoriesRo.id', $categoryId));

        /** @var list<string> $ids */
        $ids = $this->productRepository->searchIds($criteria, $context)->getIds();

        return $ids;
    }

    // Unused leftover: a limit somewhere in the file is not a bounded read.
    private function pagedCriteria(): Criteria
    {
        return (new Criteria())->setLimit(12);
    }
}
