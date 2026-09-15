<?php declare(strict_types=1);

namespace Smoke\Fixture;

use Shopware\Core\Framework\DataAbstractionLayer\EntityRepository;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Criteria;
use Shopware\Core\Framework\Context;

final class ProductLoader
{
    public function __construct(
        private readonly EntityRepository $productRepository,
    ) {
    }

    public function load(string $id, Context $context): string
    {
        $this->productRepository->search(new Criteria([$id]), $context);

        return 'swag-example-product-' . $id;
    }
}
