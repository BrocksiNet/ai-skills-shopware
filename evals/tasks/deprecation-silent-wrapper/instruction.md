# Task: fix the deprecation notice from LegacyConfigReader (core)

You are working on **Shopware core** (`shopware/shopware` trunk).
`LegacyConfigReader::read()` still calls the deprecated
`DeprecatedConfigLoader::loadLegacy()` on purpose, for backward compatibility
until v6.8.0.

That call makes core report its own deprecation, and review flagged it. Fix
`LegacyConfigReader.php` so it keeps using the legacy loader with the same
result and the same public method signature.
