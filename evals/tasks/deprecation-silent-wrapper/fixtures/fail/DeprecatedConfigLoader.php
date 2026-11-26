<?php declare(strict_types=1);

namespace Smoke\Fixture;

/**
 * @deprecated tag:v6.8.0 - Use ConfigLoader::load() instead.
 */
final class DeprecatedConfigLoader
{
    public static function loadLegacy(): string
    {
        return 'legacy-config';
    }
}
