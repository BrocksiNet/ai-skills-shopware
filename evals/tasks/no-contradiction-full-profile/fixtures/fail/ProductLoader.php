<?php declare(strict_types=1);

namespace Swag\Example\Storefront;

final class ProductLoader
{
    public function tagFor(string $productId): string
    {
        return 'swag-example-product-' . $productId;
    }
}
