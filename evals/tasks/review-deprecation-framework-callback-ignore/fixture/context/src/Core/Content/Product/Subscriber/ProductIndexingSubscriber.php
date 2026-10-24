<?php declare(strict_types=1);

namespace Shopware\Core\Content\Product\Subscriber;

use Shopware\Core\Content\Product\Events\ProductIndexerEvent;
use Shopware\Core\Framework\Log\Package;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;

#[Package('inventory')]
class ProductIndexingSubscriber implements EventSubscriberInterface
{
    public function __construct(private readonly ProductCacheInvalidator $invalidator)
    {
    }

    /**
     * @return array<string, string>
     */
    public static function getSubscribedEvents(): array
    {
        return [
            ProductIndexerEvent::class => 'onProductIndexed',
        ];
    }

    public function onProductIndexed(ProductIndexerEvent $event): void
    {
        $this->invalidator->invalidate($event->getIds());
    }
}
