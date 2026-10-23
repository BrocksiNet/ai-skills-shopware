<?php declare(strict_types=1);

namespace Acme\ProductPricing\Service;

use Shopware\Core\System\SalesChannel\SalesChannelContext;

class ProductPriceCalculator
{
    /**
     * @param iterable<SalesChannelProductEntity> $products
     */
    public function calculate(iterable $products, SalesChannelContext $context): void
    {
        foreach ($products as $product) {
            $this->calculatePrice($product, $context);
        }
    }

    private function calculatePrice(SalesChannelProductEntity $product, SalesChannelContext $context): void
    {
        // existing price logic
    }
}
