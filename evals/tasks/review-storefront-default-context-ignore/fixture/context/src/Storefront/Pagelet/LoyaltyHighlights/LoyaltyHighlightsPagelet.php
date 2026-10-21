<?php declare(strict_types=1);

namespace Swag\Loyalty\Storefront\Pagelet\LoyaltyHighlights;

use Shopware\Core\Content\Product\ProductCollection;
use Shopware\Storefront\Pagelet\Pagelet;

class LoyaltyHighlightsPagelet extends Pagelet
{
    public function __construct(
        private readonly ProductCollection $products,
    ) {
    }

    public function getProducts(): ProductCollection
    {
        return $this->products;
    }
}
