<?php declare(strict_types=1);

namespace Smoke\Fixture;

use Shopware\Core\Framework\DataAbstractionLayer\EntityRepository;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Criteria;
use Shopware\Core\Framework\Context;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

final class ProductController
{
    public function __construct(
        private readonly EntityRepository $productRepository,
    ) {
    }

    #[Route(path: '/store-api/example/products', methods: ['GET'])]
    public function list(Context $context): JsonResponse
    {
        $criteria = new Criteria();
        $criteria->setLimit(25);
        $ids = $this->productRepository->search($criteria, $context)->getIds();

        return new JsonResponse(['productIds' => $ids]);
    }
}
