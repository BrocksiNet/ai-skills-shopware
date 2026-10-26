<?php declare(strict_types=1);

namespace Shopware\Core\Content\Product\Stock;

use Shopware\Core\Framework\DataAbstractionLayer\EntityRepository;
use Shopware\Core\Framework\Log\Package;

#[Package('inventory')]
class ProductStockCleaner
{
    public function __construct(private readonly EntityRepository $productRepository)
    {
    }
}
