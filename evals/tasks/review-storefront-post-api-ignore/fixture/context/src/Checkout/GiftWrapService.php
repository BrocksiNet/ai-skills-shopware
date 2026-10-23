<?php declare(strict_types=1);

namespace Swag\GiftWrap\Checkout;

use Shopware\Core\Checkout\Cart\LineItem\LineItem;
use Shopware\Core\Checkout\Cart\SalesChannel\CartService;
use Shopware\Core\Framework\Uuid\Uuid;
use Shopware\Core\System\SalesChannel\SalesChannelContext;

class GiftWrapService
{
    public function __construct(private readonly CartService $cartService)
    {
    }

    /**
     * @return list<string>
     */
    public function options(SalesChannelContext $context): array
    {
        return ['standard', 'premium'];
    }

    public function add(string $lineItemId, SalesChannelContext $context): void
    {
        $cart = $this->cartService->getCart($context->getToken(), $context);

        $this->cartService->add($cart, new LineItem(Uuid::randomHex(), 'gift-wrap', $lineItemId, 1), $context);
    }
}
