<?php declare(strict_types=1);

namespace Shopware\Core\Content\Product\SalesChannel;

use Shopware\Core\Framework\Extensions\ExtensionDispatcher;

final class ProductBadgeRoute
{
    public function load(): ProductBadgeRouteResponse
    {
        return new ProductBadgeRouteResponse();
    }
}
