# Task: wrap BC deprecation call with Feature::silent

Core must not trigger self-deprecation when it still calls deprecated behavior for BC.

Update `LegacyConfigReader.php` so the call to `DeprecatedConfigLoader::loadLegacy()`
is wrapped with:

```php
Feature::silent('v6.8.0', static fn () => DeprecatedConfigLoader::loadLegacy());
```

Add the correct `use Shopware\Core\Framework\Feature;` import.

Keep the public method signature unchanged. Do not remove the legacy call — only
suppress the deprecation notice correctly.
