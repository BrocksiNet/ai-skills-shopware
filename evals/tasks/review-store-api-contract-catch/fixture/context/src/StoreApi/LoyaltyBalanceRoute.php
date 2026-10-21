<?php declare(strict_types=1);

namespace Swag\Loyalty\StoreApi;

use Shopware\Core\Framework\Log\Package;
use Shopware\Core\System\SalesChannel\SalesChannelContext;
use Shopware\Core\System\SalesChannel\StoreApiResponse;
use Swag\Loyalty\LoyaltyLedger;
use Symfony\Component\Routing\Attribute\Route;

#[Route(defaults: ['_routeScope' => ['store-api'], '_loginRequired' => true])]
#[Package('checkout')]
class LoyaltyBalanceRoute
{
    public function __construct(private readonly LoyaltyLedger $ledger)
    {
    }

    #[Route(path: '/store-api/loyalty/balance', name: 'store-api.loyalty.balance', methods: ['GET'])]
    public function load(SalesChannelContext $context): StoreApiResponse
    {
        $customer = $context->getCustomer();
        \assert($customer !== null);

        return new StoreApiResponse(new LoyaltyBalanceStruct(
            $this->ledger->points($customer->getId(), $context->getContext()),
            $this->ledger->tier($customer->getId(), $context->getContext()),
        ));
    }
}
