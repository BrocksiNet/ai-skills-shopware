<?php declare(strict_types=1);

namespace Swag\Example\Subscriber;

use Shopware\Core\Content\Product\Events\ProductDetailRouteCacheTagsEvent;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;

final class CacheSubscriber implements EventSubscriberInterface
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
