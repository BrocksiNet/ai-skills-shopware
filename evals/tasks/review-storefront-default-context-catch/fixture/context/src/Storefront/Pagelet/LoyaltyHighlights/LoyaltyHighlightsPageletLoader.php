<?php declare(strict_types=1);

namespace Swag\Loyalty\Storefront\Pagelet\LoyaltyHighlights;

use Shopware\Core\Content\Product\ProductCollection;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Criteria;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Filter\RangeFilter;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Sorting\FieldSorting;
use Shopware\Core\System\SalesChannel\Entity\SalesChannelRepository;
use Shopware\Core\System\SalesChannel\SalesChannelContext;

class LoyaltyHighlightsPageletLoader
{
    /**
     * @param SalesChannelRepository<ProductCollection> $productRepository
     */
    public function __construct(
        private readonly SalesChannelRepository $productRepository,
    ) {
    }

    public function load(SalesChannelContext $salesChannelContext): LoyaltyHighlightsPagelet
    {
        $criteria = new Criteria();
        $criteria->addFilter(new RangeFilter('customFields.swag_loyalty_bonus_points', [RangeFilter::GT => 0]));
        $criteria->addAssociation('cover.media');
        $criteria->addSorting(new FieldSorting('customFields.swag_loyalty_bonus_points', FieldSorting::DESCENDING));
        $criteria->setLimit(4);

        return new LoyaltyHighlightsPagelet(
            $this->productRepository->search($criteria, $salesChannelContext)->getEntities()
        );
    }
}
