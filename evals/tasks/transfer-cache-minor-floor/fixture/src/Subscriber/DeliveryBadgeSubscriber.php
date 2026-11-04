<?php declare(strict_types=1);
namespace Swag\DeliveryTools\Subscriber;
use Shopware\Core\Framework\Adapter\Cache\CacheTagCollector;
use Shopware\Core\Framework\Adapter\Cache\CacheInvalidator;
use Shopware\Storefront\Page\Product\ProductPageLoadedEvent;
use Symfony\Contracts\EventDispatcher\EventDispatcherInterface;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
final class DeliveryBadgeSubscriber implements EventSubscriberInterface
{
    public function __construct(
        private readonly CacheTagCollector $collector,
        private readonly CacheInvalidator $invalidator,
        private readonly EventDispatcherInterface $dispatcher,
    ) {}
    public static function getSubscribedEvents(): array { return [ProductPageLoadedEvent::class => 'onLoaded']; }
    public function onLoaded(ProductPageLoadedEvent $event): void
    {
        $channel = $event->getSalesChannelContext()->getSalesChannelId();
        $tag = 'delivery-badge-' . $channel;
        $this->collector->addTag($tag);
    }
    public function invalidate(string $channel): void { $this->invalidator->invalidate(['delivery-badge-' . $channel]); }
}
