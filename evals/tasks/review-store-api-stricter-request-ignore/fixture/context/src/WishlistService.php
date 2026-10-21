<?php declare(strict_types=1);

namespace Swag\Wishlist;

use Shopware\Core\System\SalesChannel\SalesChannelContext;

class WishlistService
{
    public function add(string $productId, string $list, SalesChannelContext $context): void
    {
        // writes swag_wishlist_item through the DAL
    }
}
