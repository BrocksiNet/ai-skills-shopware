<?php declare(strict_types=1);

namespace Swag\Loyalty\Tier;

use Shopware\Core\Framework\Adapter\Cache\CacheTagCollector;
use Shopware\Core\Framework\DataAbstractionLayer\EntityRepository;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Criteria;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Sorting\FieldSorting;
use Shopware\Core\System\SalesChannel\SalesChannelContext;
use Symfony\Component\HttpFoundation\Request;

/**
 * Loads the tiers for the "Loyalty tiers" storefront page, which is HTTP
 * cached and tagged per tier.
 */
class TierPageLoader
{
    public function __construct(
        private readonly EntityRepository $tierRepository,
        private readonly CacheTagCollector $cacheTagCollector,
    ) {
    }

    public function load(Request $request, SalesChannelContext $context): TierCollection
    {
        $criteria = (new Criteria())
            ->addSorting(new FieldSorting('threshold'))
            ->setLimit(50);

        /** @var TierCollection $tiers */
        $tiers = $this->tierRepository->search($criteria, $context->getContext())->getEntities();

        foreach ($tiers as $tier) {
            $this->cacheTagCollector->addTag($request, 'swag-loyalty-tier-' . $tier->getId());
        }

        return $tiers;
    }
}
