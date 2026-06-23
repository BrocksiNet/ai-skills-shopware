<?php declare(strict_types=1);

namespace Smoke\Fixture;

final class LegacyConfigReader
{
    public function read(): string
    {
        return DeprecatedConfigLoader::loadLegacy();
    }
}
