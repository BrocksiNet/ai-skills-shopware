# HTTP cache tags (Shopware 6.7+)

Load this when adding or invalidating cache tags, or when you see deprecated
cache-tag events.

## The 6.7 model

Caching moved from the Store-API route layer to the HTTP layer. The mental model
is simple: collect tags anywhere, invalidate by the same tags.

```php
use Shopware\Core\Framework\Adapter\Cache\CacheTagCollector;

public function __construct(private readonly CacheTagCollector $collector) {}

public function onProductPageLoaded(ProductPageLoadedEvent $event): void
{
    $this->collector->addTag('my-plugin-' . $event->getSalesChannelContext()->getSalesChannelId());
}
```

Invalidate when the underlying data changes:

```php
$this->cacheInvalidator->invalidate(['my-plugin-' . $salesChannelId]);
```

## Deprecated — do not use

The `*CacheTagsEvent` events (`ProductDetailRouteCacheTagsEvent`,
`NavigationRouteCacheTagsEvent`, `CategoryRouteCacheTagsEvent`, …) are deprecated
in 6.7, no longer dispatched, and removed in 6.8. Do not subscribe to them.
Migrate any existing subscriber to inject `CacheTagCollector` from a regular
page-loaded event.

## Compatibility

If the plugin still supports 6.6, gate the new API behind a version check (see
`version-compatibility.md`) or require 6.7+ in `composer.json` and say so.

## Done

- [ ] Tags added via `CacheTagCollector::addTag()`, not a `*CacheTagsEvent`.
- [ ] Invalidation calls `CacheInvalidator::invalidate()` with the same tags.
- [ ] 6.6 path handled or the 6.7 requirement made explicit.
