<?php declare(strict_types=1);

namespace Shopware\Core\Content\Product\SalesChannel\Review;

use Shopware\Core\Content\Product\Aggregate\ProductReview\ProductReviewCollection;
use Shopware\Core\Framework\Context;
use Shopware\Core\Framework\DataAbstractionLayer\EntityRepository;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Criteria;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Filter\EqualsFilter;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Sorting\FieldSorting;
use Shopware\Core\Framework\Log\Package;

/**
 * @internal
 */
#[Package('after-sales')]
class ProductReviewLoader
{
    public const SORT_NEWEST = 'newest';
    public const SORT_POINTS = 'points';

    /**
     * @param EntityRepository<ProductReviewCollection> $productReviewRepository
     */
    public function __construct(
        private readonly EntityRepository $productReviewRepository,
    ) {
    }

    public function loadForProduct(string $productId, string $sort, Context $context): ProductReviewCollection
    {
        $criteria = new Criteria();
        $criteria->addFilter(new EqualsFilter('productId', $productId));
        $criteria->addSorting(match ($sort) {
            self::SORT_POINTS => new FieldSorting('points', FieldSorting::DESCENDING),
            default => new FieldSorting('createdAt', FieldSorting::DESCENDING),
        });
        $criteria->setLimit(10);

        return $this->productReviewRepository->search($criteria, $context)->getEntities();
    }
}
