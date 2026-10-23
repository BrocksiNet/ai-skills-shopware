<?php declare(strict_types=1);

namespace Shopware\Core\Checkout\Cart;

/**
 * Turns a cart into the array the storefront and the Store API return.
 */
final class CartNormalizer
{
    /**
     * @return array<string, mixed>
     */
    public function normalize(Cart $cart): array
    {
        return $cart->jsonSerialize();
    }
}
