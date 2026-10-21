<?php declare(strict_types=1);

namespace Swag\Loyalty\Subscriber;

use Shopware\Core\Framework\Struct\ArrayStruct;
use Shopware\Storefront\Page\Product\ProductPageLoadedEvent;
use Swag\Loyalty\LoyaltyLedger;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;

class LoyaltyPageSubscriber implements EventSubscriberInterface
{
    public function __construct(private readonly LoyaltyLedger $ledger)
    {
    }

    public static function getSubscribedEvents(): array
    {
        return [ProductPageLoadedEvent::class => 'onProductPageLoaded'];
    }

    public function onProductPageLoaded(ProductPageLoadedEvent $event): void
    {
        $customer = $event->getSalesChannelContext()->getCustomer();
        if ($customer === null) {
            return;
        }

        $event->getPage()->addExtension('swagLoyalty', new ArrayStruct([
            'points' => $this->ledger->points($customer->getId(), $event->getContext()),
        ]));
    }
}
