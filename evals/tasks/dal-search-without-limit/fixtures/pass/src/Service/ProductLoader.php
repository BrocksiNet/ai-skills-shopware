<?php declare(strict_types=1);

namespace Swag\Example\Service;

use Shopware\Core\Framework\Context;
use Shopware\Core\Framework\DataAbstractionLayer\EntityRepository;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Criteria;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Filter\EqualsFilter;

class ProductLoader
{
    private const TEASER_SIZE = 12;

    public function __construct(
        private readonly EntityRepository $productRepository,
    ) {
    }

    /**
     * @return list<string>
     */
    public function loadForCategory(string $categoryId, Context $context): array
    {
        /** @var list<string> $ids */
        $ids = $this->productRepository->searchIds($this->teaserCriteria($categoryId), $context)->getIds();

        return $ids;
    }

    private function teaserCriteria(string $categoryId): Criteria
    {
        $criteria = new Criteria();
        $criteria->addFilter(new EqualsFilter('categoriesRo.id', $categoryId));
        $criteria->setLimit(self::TEASER_SIZE);

        return $criteria;
    }
}
