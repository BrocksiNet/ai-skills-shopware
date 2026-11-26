<?php declare(strict_types=1);

namespace Smoke\Fixture;

use Shopware\Core\Framework\Feature;

final class LegacyConfigReader
{
    public function read(): string
    {
        Feature::silent('v6.8.0', static fn () => null);
        $value = DeprecatedConfigLoader::loadLegacy();

        return $value;
    }
}
