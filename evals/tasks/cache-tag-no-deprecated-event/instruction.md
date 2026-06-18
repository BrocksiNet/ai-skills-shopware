# Task: migrate to CacheTagCollector (6.7)

This is a Shopware 6.7 plugin. The file `CacheSubscriber.php` currently
uses the deprecated `ProductDetailRouteCacheTagsEvent` to add a cache tag.

Migrate it to the Shopware 6.7+ approach: add the cache tag via
`CacheTagCollector::addTag()` from a regular page-loaded event subscriber, and
remove the deprecated `*CacheTagsEvent` usage entirely.
