<?php declare(strict_types=1);

namespace Swag\Example\Subscriber;

use Shopware\Core\Content\Product\Events\ProductDetailRouteCacheTagsEvent;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;

// DEPRECATED PATTERN (removed in 6.8). The task is to migrate this away from
// the *CacheTagsEvent to the CacheTagCollector approach.
class CacheSubscriber implements EventSubscriberInterface
{
    public static function getSubscribedEvents(): array
    {
        return [
            ProductDetailRouteCacheTagsEvent::class => 'onCacheTags',
        ];
    }

    public function onCacheTags(ProductDetailRouteCacheTagsEvent $event): void
    {
        $event->addTags(['swag-example-product']);
    }
}
