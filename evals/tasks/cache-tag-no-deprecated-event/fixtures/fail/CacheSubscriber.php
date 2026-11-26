<?php declare(strict_types=1);

namespace Swag\Example\Subscriber;

use Shopware\Storefront\Page\Product\ProductPageLoadedEvent;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;

final class CacheSubscriber implements EventSubscriberInterface
{
    public static function getSubscribedEvents(): array
    {
        return [
            ProductPageLoadedEvent::class => 'onPageLoaded',
        ];
    }

    public function onPageLoaded(ProductPageLoadedEvent $event): void
    {
        // TODO: inject CacheTagCollector and call $this->cacheTagCollector->addTag('swag-example-product')
    }
}
