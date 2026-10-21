<?php declare(strict_types=1);

namespace Swag\Loyalty\Event;

use Shopware\Core\Checkout\Cart\Cart;
use Shopware\Core\Framework\Context;
use Symfony\Contracts\EventDispatcher\Event;

/**
 * Dispatched before the points for a cart are stored. Listeners may change `points`.
 */
final class LoyaltyPointsCalculateEvent extends Event
{
    /**
     * @internal
     */
    public function __construct(
        public readonly Cart $cart,
        public readonly string $salesChannelId,
        public readonly ?string $customerGroupId,
        public readonly Context $context,
        public int $points,
    ) {
    }
}
