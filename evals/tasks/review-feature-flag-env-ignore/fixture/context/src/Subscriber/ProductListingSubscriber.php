<?php declare(strict_types=1);

namespace Swag\ShopHealth\Subscriber;

use Shopware\Core\Content\Product\SalesChannel\Listing\ProductListingCriteriaEvent;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;

class ProductListingSubscriber implements EventSubscriberInterface
{
    public static function getSubscribedEvents(): array
    {
        return [
            ProductListingCriteriaEvent::class => 'onCriteria',
        ];
    }

    public function onCriteria(ProductListingCriteriaEvent $event): void
    {
        $criteria = $event->getCriteria();
        $criteria->setLimit(24);
    }
}
