<?php declare(strict_types=1);

namespace Smoke\Fixture;

use Shopware\Core\Framework\Context;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

#[Route(defaults: ['_routeScope' => ['store-api']])]
final class ProductController
{
    public function __construct(
        private readonly ProductListingService $listingService,
    ) {
    }

    #[Route(path: '/store-api/example/products', methods: ['GET'])]
    public function list(Context $context): JsonResponse
    {
        return new JsonResponse(['productIds' => $this->listingService->listProductIds($context)]);
    }
}
