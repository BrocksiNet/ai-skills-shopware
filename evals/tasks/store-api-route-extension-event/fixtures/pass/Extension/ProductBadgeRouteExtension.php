<?php declare(strict_types=1);

namespace Shopware\Core\Content\Product\SalesChannel\Extension;

use Shopware\Core\Content\Product\SalesChannel\ProductBadgeRouteResponse;
use Shopware\Core\Framework\Extensions\Extension;

/**
 * @extends Extension<ProductBadgeRouteResponse>
 */
final class ProductBadgeRouteExtension extends Extension
{
    public const NAME = 'product-badge.load';
}
