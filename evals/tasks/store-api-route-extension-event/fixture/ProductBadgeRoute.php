<?php declare(strict_types=1);

namespace Shopware\Core\Content\Product\SalesChannel;

abstract class AbstractProductBadgeRoute
{
    abstract public function getDecorated(): AbstractProductBadgeRoute;

    abstract public function load(): ProductBadgeRouteResponse;
}

class ProductBadgeRoute extends AbstractProductBadgeRoute
{
    public function getDecorated(): AbstractProductBadgeRoute
    {
        throw new \RuntimeException('not decorated');
    }

    public function load(): ProductBadgeRouteResponse
    {
        return new ProductBadgeRouteResponse();
    }
}
