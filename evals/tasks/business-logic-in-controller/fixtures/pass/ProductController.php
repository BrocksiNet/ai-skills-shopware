<?php declare(strict_types=1);

namespace Smoke\Fixture;

use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

final class ProductController
{
    public function __construct(
        private readonly ProductListingService $listingService,
    ) {
    }

    #[Route(path: '/store-api/example/products', methods: ['GET'])]
    public function list(): JsonResponse
    {
        return new JsonResponse(['productIds' => $this->listingService->listProductIds()]);
    }
}
