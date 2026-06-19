<?php declare(strict_types=1);

namespace Swag\Example\Subscriber;

use Shopware\Core\Framework\Adapter\Cache\CacheTagCollector;
use Shopware\Storefront\Page\Product\ProductPageLoadedEvent;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;

final class CacheSubscriber implements EventSubscriberInterface
{
    public function __construct(
        private readonly CacheTagCollector $cacheTagCollector,
    ) {
    }

    public static function getSubscribedEvents(): array
    {
        return [
            ProductPageLoadedEvent::class => 'onPageLoaded',
        ];
    }

    public function onPageLoaded(ProductPageLoadedEvent $event): void
    {
        $this->cacheTagCollector->addTag('swag-example-product');
    }
}
