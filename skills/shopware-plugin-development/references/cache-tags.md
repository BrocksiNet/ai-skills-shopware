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

`CacheTagCollector::addTag()` exists from 6.7.2. For 6.7.0 and 6.7.1, dispatch
`new AddCacheTagEvent(...$tags)`
(`Shopware\Core\Framework\Adapter\Cache\Event\AddCacheTagEvent`, available
since 6.6.6.0); it reaches the same collector.

Invalidate when the underlying data changes:

```php
$this->cacheInvalidator->invalidate(['my-plugin-' . $salesChannelId]);
```

## Deprecated — do not use

- **PLG-007** **On 6.7+, add tags through `CacheTagCollector::addTag()`
  (6.7.2+) or `AddCacheTagEvent` (6.7.0, 6.7.1); never subscribe to a
  `*CacheTagsEvent`.**

The `*CacheTagsEvent` events (`ProductDetailRouteCacheTagsEvent`,
`NavigationRouteCacheTagsEvent`, `CategoryRouteCacheTagsEvent`, …) are deprecated
in 6.7, no longer dispatched, and removed in 6.8. Do not subscribe to them.
A subscriber to one of them never runs, so its tags never reach the HTTP cache and
the invalidation that relies on them misses. Migrate it to a regular page-loaded
event that adds the tags through `CacheTagCollector` or `AddCacheTagEvent`.

## Compatibility

If the plugin still supports 6.6, gate the new API behind a version check (see
`version-compatibility.md`) or require 6.7+ in `composer.json` and say so.

## Done

- [ ] Tags added via `CacheTagCollector::addTag()` (6.7.2+) or `AddCacheTagEvent`,
  not a `*CacheTagsEvent`.
- [ ] Invalidation calls `CacheInvalidator::invalidate()` with the same tags.
- [ ] 6.6 path handled or the 6.7 requirement made explicit.
