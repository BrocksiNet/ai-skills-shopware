<?php declare(strict_types=1);

namespace Smoke\Fixture;

use Shopware\Core\Framework\Feature;

final class LegacyConfigReader
{
    public function read(): string
    {
        return Feature::silent('v6.8.0', static fn () => DeprecatedConfigLoader::loadLegacy());
    }
}
