<?php declare(strict_types=1);

namespace Shopware\Core\Content\Product\SalesChannel\Review;

use Shopware\Core\Content\Product\Aggregate\ProductReview\ProductReviewCollection;
use Shopware\Core\Framework\Context;
use Shopware\Core\Framework\DataAbstractionLayer\EntityRepository;
use Shopware\Core\Framework\Log\Package;

/**
 * @internal
 */
#[Package('after-sales')]
class ProductReviewModerator
{
    /**
     * @param EntityRepository<ProductReviewCollection> $productReviewRepository
     */
    public function __construct(
        private readonly EntityRepository $productReviewRepository,
    ) {
    }

    public function moderate(string $reviewId, ProductReviewModerationState $state, Context $context): void
    {
        $this->productReviewRepository->update([
            ['id' => $reviewId, 'moderationState' => $state->value],
        ], $context);
    }
}
