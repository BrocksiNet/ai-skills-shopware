<?php declare(strict_types=1);

namespace Shopware\Core\Content\Product\SalesChannel\Price;

use Shopware\Core\Content\Product\SalesChannel\SalesChannelProductEntity;
use Shopware\Core\Framework\Log\Package;
use Shopware\Core\Framework\Plugin\Exception\DecorationPatternException;
use Shopware\Core\System\SalesChannel\SalesChannelContext;

#[Package('inventory')]
class ProductPriceCalculator extends AbstractProductPriceCalculator
{
    public function __construct(private readonly PriceRuleMatcher $matcher)
    {
    }

    public function getDecorated(): AbstractProductPriceCalculator
    {
        throw new DecorationPatternException(self::class);
    }

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
        $product->setCalculatedPrices($this->matcher->match($context)->pricesFor($product));
    }
}
