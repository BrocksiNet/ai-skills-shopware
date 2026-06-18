<?php declare(strict_types=1);

namespace Smoke\Fixture;

use Shopware\Core\Content\Product\ProductEntity;
use Shopware\Core\Framework\DataAbstractionLayer\EntityRepository;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Criteria;

final class ProductReader
{
    public function __construct(
        private readonly EntityRepository $productRepository,
    ) {
    }

    public function findById(string $productId): ?ProductEntity
    {
        /** @var ProductEntity|null $product */
        $product = $this->productRepository->search(new Criteria([$productId]), \Shopware\Core\Framework\Context::createDefaultContext())->first();

        return $product;
    }
}
