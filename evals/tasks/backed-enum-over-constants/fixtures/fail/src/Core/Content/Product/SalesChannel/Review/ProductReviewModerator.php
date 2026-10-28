<?php declare(strict_types=1);

namespace Shopware\Core\Content\Product\SalesChannel\Review;

use Shopware\Core\Content\Product\Aggregate\ProductReview\ProductReviewCollection;
use Shopware\Core\Framework\Context;
use Shopware\Core\Framework\DataAbstractionLayer\EntityRepository;
use Shopware\Core\Framework\Log\Package;

/**
 * The enum exists, but the API still takes strings checked against constants.
 *
 * @internal
 */
#[Package('after-sales')]
class ProductReviewModerator
{
    public const STATE_PENDING = 'pending';
    public const STATE_APPROVED = 'approved';
    public const STATE_REJECTED = 'rejected';

    /**
     * @param EntityRepository<ProductReviewCollection> $productReviewRepository
     */
    public function __construct(
        private readonly EntityRepository $productReviewRepository,
    ) {
    }

    public function moderate(string $reviewId, string $state, Context $context): void
    {
        $this->productReviewRepository->update([
            ['id' => $reviewId, 'moderationState' => $state],
        ], $context);
    }
}
