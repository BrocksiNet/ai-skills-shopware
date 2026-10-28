<?php declare(strict_types=1);

namespace Swag\Loyalty\Controller\StoreApi;

use Shopware\Core\Framework\Log\Package;
use Shopware\Core\System\SalesChannel\SalesChannelContext;
use Swag\Loyalty\Points\PointsBalance;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

#[Route(defaults: ['_routeScope' => ['store-api']])]
#[Package('checkout')]
class LoyaltyController extends AbstractController
{
    public function __construct(private readonly PointsBalance $balance)
    {
    }

    #[Route(
        path: '/store-api/swag-loyalty/points',
        name: 'store-api.swag-loyalty.points',
        defaults: ['_loginRequired' => true],
        methods: ['GET'],
    )]
    public function points(SalesChannelContext $context): JsonResponse
    {
        return new JsonResponse([
            'points' => $this->balance->forCustomer($context),
        ]);
    }
}
