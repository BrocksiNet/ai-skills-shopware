<?php declare(strict_types=1);

namespace Swag\Loyalty\Storefront\Controller;

use Shopware\Core\Checkout\Customer\CustomerEntity;
use Shopware\Core\System\SalesChannel\SalesChannelContext;
use Shopware\Storefront\Controller\StorefrontController;
use Swag\Loyalty\Service\LoyaltyPointsService;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

#[Route(defaults: ['_routeScope' => ['storefront']])]
class LoyaltyController extends StorefrontController
{
    public function __construct(
        private readonly LoyaltyPointsService $pointsService,
    ) {
    }

    #[Route(
        path: '/widgets/loyalty/balance',
        name: 'frontend.loyalty.balance',
        defaults: ['XmlHttpRequest' => true, '_loginRequired' => true],
        methods: ['GET']
    )]
    public function balance(CustomerEntity $customer, SalesChannelContext $context): JsonResponse
    {
        return new JsonResponse([
            'points' => $this->pointsService->getBalance($customer->getId(), $context->getContext()),
        ]);
    }
}
