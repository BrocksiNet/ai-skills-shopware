<?php declare(strict_types=1);

namespace Swag\ListingTools\Listing;

use Shopware\Core\Content\Product\Events\ProductListingCriteriaEvent;
use Shopware\Core\System\SystemConfig\SystemConfigService;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;

class ListingCriteriaSubscriber implements EventSubscriberInterface
{
    public function __construct(private readonly SystemConfigService $config)
    {
    }

    public static function getSubscribedEvents(): array
    {
        return [ProductListingCriteriaEvent::class => 'onCriteria'];
    }

    public function onCriteria(ProductListingCriteriaEvent $event): void
    {
        $event->getCriteria()->addAssociation('cover');
    }
}
