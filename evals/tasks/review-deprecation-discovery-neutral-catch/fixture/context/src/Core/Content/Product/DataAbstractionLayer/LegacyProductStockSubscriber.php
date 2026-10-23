<?php declare(strict_types=1);

namespace Shopware\Core\Content\Product\DataAbstractionLayer;

use Shopware\Core\Content\Product\ProductEvents;
use Shopware\Core\Framework\DataAbstractionLayer\Event\EntityWrittenContainerEvent;
use Shopware\Core\Framework\Log\Package;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;

#[Package('inventory')]
class LegacyProductStockSubscriber implements EventSubscriberInterface
{
    public function __construct(private readonly ProductStockIndexer $indexer)
    {
    }

    public static function getSubscribedEvents(): array
    {
        return [
            ProductEvents::PRODUCT_WRITTEN_EVENT => 'onProductWritten',
        ];
    }

    public function onProductWritten(EntityWrittenContainerEvent $event): void
    {
        $this->indexer->refresh($event->getEventIds());
    }
}
