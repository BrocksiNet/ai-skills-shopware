<?php declare(strict_types=1);

namespace Shopware\Core\Content\Product\SalesChannel;

use Shopware\Core\Content\Product\SalesChannel\Extension\ProductBadgeRouteExtension;
use Shopware\Core\Framework\Extensions\ExtensionDispatcher;

final class ProductBadgeRoute
{
    public function __construct(private readonly ExtensionDispatcher $extensions)
    {
    }

    public function load(): ProductBadgeRouteResponse
    {
        return $this->extensions->publish(
            name: ProductBadgeRouteExtension::NAME,
            extension: new ProductBadgeRouteExtension(),
            function: fn (): ProductBadgeRouteResponse => new ProductBadgeRouteResponse(),
        );
    }
}
