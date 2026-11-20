<?php declare(strict_types=1);

namespace Smoke\Fixture;

use Monolog\Logger;
use Shopware\Core\Content\Product\ProductEntity;
use Shopware\Core\Framework\DataAbstractionLayer\EntityRepository;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Criteria;

// LoggerInterface ProductRepositoryInterface
final class ProductReader
{
    public function __construct(
        private readonly EntityRepository $productRepository,
        private readonly Logger $logger,
    ) {
    }

    public function findById(string $productId): ?ProductEntity
    {
        $this->logger->debug('Reading product', ['id' => $productId]);

        /** @var ProductEntity|null $product */
        $product = $this->productRepository->search(new Criteria([$productId]), \Shopware\Core\Framework\Context::createDefaultContext())->first();

        return $product;
    }
}
