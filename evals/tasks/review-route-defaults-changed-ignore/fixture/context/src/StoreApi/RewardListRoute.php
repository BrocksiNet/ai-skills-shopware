<?php declare(strict_types=1);

namespace Swag\Loyalty\StoreApi;

use Shopware\Core\Framework\Log\Package;
use Shopware\Core\System\SalesChannel\SalesChannelContext;
use Shopware\Core\System\SalesChannel\StoreApiResponse;
use Swag\Loyalty\RewardCatalog;
use Symfony\Component\Routing\Attribute\Route;

#[Route(defaults: ['_routeScope' => ['store-api'], '_httpCache' => true])]
#[Package('checkout')]
class RewardListRoute
{
    public function __construct(private readonly RewardCatalog $catalog)
    {
    }

    #[Route(path: '/store-api/swag-loyalty/rewards', name: 'store-api.swag-loyalty.rewards', methods: ['GET', 'POST'])]
    public function load(SalesChannelContext $context): StoreApiResponse
    {
        return new StoreApiResponse($this->catalog->rewards($context));
    }
}
