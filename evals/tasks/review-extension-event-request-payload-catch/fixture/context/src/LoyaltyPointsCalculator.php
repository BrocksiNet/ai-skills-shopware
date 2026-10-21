<?php declare(strict_types=1);

namespace Swag\Loyalty;

use Shopware\Core\Checkout\Cart\Cart;
use Shopware\Core\System\SalesChannel\SalesChannelContext;
use Swag\Loyalty\Event\LoyaltyPointsCalculateEvent;
use Symfony\Contracts\EventDispatcher\EventDispatcherInterface;

class LoyaltyPointsCalculator
{
    public function __construct(
        private readonly LoyaltyConfigReader $config,
        private readonly EventDispatcherInterface $dispatcher,
    ) {
    }

    public function calculate(Cart $cart, SalesChannelContext $context): int
    {
        $rate = $this->config->pointsPerEuro($context->getSalesChannelId());
        $points = (int) floor($cart->getPrice()->getTotalPrice() * $rate);

        $event = new LoyaltyPointsCalculateEvent(
            $cart,
            $context->getSalesChannelId(),
            $context->getCustomer()?->getGroupId(),
            $context->getContext(),
            $points,
        );
        $this->dispatcher->dispatch($event);

        return $event->points;
    }
}
