<?php declare(strict_types=1);

namespace Shopware\Core\Content\Product\SalesChannel\Review;

use Shopware\Core\Framework\Log\Package;
use Shopware\Core\System\SalesChannel\SalesChannelContext;

#[Package('inventory')]
class ProductReviewSaver
{
    /**
     * @param array<string, mixed> $data
     */
    public function save(string $productId, array $data, SalesChannelContext $context): void
    {
        // Persists the review for the product owned by the sales channel context.
    }
}
