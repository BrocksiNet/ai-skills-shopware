<?php declare(strict_types=1);

namespace Swag\DigitalGoodsShipping\Subscriber;

use Shopware\Core\Checkout\Cart\Event\BeforeLineItemAddedEvent;
use Shopware\Core\Checkout\Cart\LineItem\LineItem;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;

class DigitalLineItemSubscriber implements EventSubscriberInterface
{
    public const DIGITAL_GOOD_TYPE = 'swag-digital-good';

    public static function getSubscribedEvents(): array
    {
        return [BeforeLineItemAddedEvent::class => 'onLineItemAdded'];
    }

    public function onLineItemAdded(BeforeLineItemAddedEvent $event): void
    {
        $this->excludeFromShipping($event->getLineItem());
    }

    private function excludeFromShipping(LineItem $lineItem): void
    {
        if ($lineItem->getType() !== self::DIGITAL_GOOD_TYPE) {
            return;
        }

        $lineItem->setShippingCostAware(false);
    }
}
