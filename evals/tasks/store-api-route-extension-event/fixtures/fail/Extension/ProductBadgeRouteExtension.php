<?php declare(strict_types=1);

namespace Shopware\Core\Content\Product\SalesChannel\Extension;

use Shopware\Core\Framework\Extensions\ExtensionDispatcher;
use Shopware\Core\Framework\Extensions\Extension;

/** Published through ExtensionDispatcher::publish(). */
final class ProductBadgeRouteExtension extends Extension
{
    public function dispatchWith(ExtensionDispatcher $d): void
    {
        $d->publish('x', $this, fn () => null);
    }
}
