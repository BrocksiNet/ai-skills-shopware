<?php declare(strict_types=1);

namespace Swag\Recommendation\Recommendation;

use Shopware\Core\Content\Product\SalesChannel\SalesChannelProductCollection;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Criteria;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Filter\EqualsFilter;
use Shopware\Core\System\SalesChannel\Entity\SalesChannelRepository;
use Shopware\Core\System\SalesChannel\SalesChannelContext;

class RecommendationLoader
{
    /**
     * @param SalesChannelRepository<SalesChannelProductCollection> $productRepository
     */
    public function __construct(
        private readonly SalesChannelRepository $productRepository,
        private readonly CoPurchaseScorer $scorer,
    ) {
    }

    /**
     * @return list<string> product ids, best match first
     */
    public function load(string $productId, int $limit, SalesChannelContext $context): array
    {
        $criteria = new Criteria($this->scorer->candidates($productId));
        $criteria->addFilter(new EqualsFilter('active', true));
        $criteria->setLimit($limit);

        // Visibility, prices and stock depend on the sales channel and customer group.
        $products = $this->productRepository->search($criteria, $context)->getEntities();

        return $this->scorer->rank($productId, $products);
    }
}
