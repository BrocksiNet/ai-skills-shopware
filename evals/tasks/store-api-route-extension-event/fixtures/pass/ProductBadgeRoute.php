<?php declare(strict_types=1);

namespace Shopware\Core\Content\Product\SalesChannel;

final class ProductBadgeRoute
{
    public function __construct(private readonly ExtensionDispatcher $extensions)
    {
    }

    public function load(): ProductBadgeRouteResponse
    {
        return $this->extensions->publish(
            ProductBadgeExtension::class,
            new ProductBadgeExtension(),
            fn () => new ProductBadgeRouteResponse(),
        );
    }
}
