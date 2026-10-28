<?php declare(strict_types=1);

namespace Swag\LoyaltyPoints\Subscriber;

use Shopware\Core\Framework\Struct\ArrayStruct;
use Shopware\Storefront\Page\Checkout\Finish\CheckoutFinishPageLoadedEvent;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;

class CheckoutFinishSubscriber implements EventSubscriberInterface
{
    public static function getSubscribedEvents(): array
    {
        return [
            CheckoutFinishPageLoadedEvent::class => 'onFinishPageLoaded',
        ];
    }

    public function onFinishPageLoaded(CheckoutFinishPageLoadedEvent $event): void
    {
        $page = $event->getPage();
        $order = $page->getOrder();

        $page->addExtension('swagLoyaltyTier', new ArrayStruct([
            'tier' => $order->getCustomFields()['swag_loyalty_tier'] ?? 'basic',
        ]));
    }
}
