<?php declare(strict_types=1);

namespace Shopware\Core\Content\Product;

use Shopware\Core\Framework\Deprecation\BCChange\ParameterTypeNarrowing;

final class LegacyIdLoader
{
    #[ParameterTypeNarrowing(version: 'v6.7.0', parameterName: 'identifier', newType: 'int')]
    public function load(string|int $id): string
    {
        return (string) $id;
    }
}
