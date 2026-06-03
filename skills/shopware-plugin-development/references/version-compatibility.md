# Shopware 6.6 / 6.7 compatibility

Load this when a plugin must support more than one Shopware minor, or when you
introduce API that only exists in one of them.

## First: know the supported range

Check `composer.json` `require` for `shopware/core` (e.g. `~6.6.0 || ~6.7.0`).
That range is the contract. Your change must keep working across all of it, or
you must consciously narrow the range and call it out.

## Guarding version-specific code

When an API exists only in 6.7 (e.g. `CacheTagCollector`) but you still support
6.6:

- Prefer requiring 6.7+ and bumping `composer.json` *if* the project allows it —
  and state the bump explicitly.
- Otherwise gate at runtime. Use capability checks (class/method/service exists)
  rather than version-string parsing where possible:

```php
if (class_exists(CacheTagCollector::class)) {
    // 6.7+ path
} else {
    // 6.6 fallback
}
```

- Keep both paths covered by tests, or at least smoke-checked, until you drop the
  old minor.

## Deprecations you will meet

6.7 deprecated and stopped dispatching the `*CacheTagsEvent` events (removed in
6.8). Treat any 6.6-era pattern that the 6.7 upgrade guide flags as a migration
target, not something to copy.

## Done

- [ ] Supported `shopware/core` range identified from `composer.json`.
- [ ] Version-only API gated, or the range narrowed and the bump flagged.
- [ ] Both supported minors still work (tested/smoke-checked).
