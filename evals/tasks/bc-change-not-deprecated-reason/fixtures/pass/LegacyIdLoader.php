<?php declare(strict_types=1);

namespace Shopware\Core\Content\Product;

use Shopware\Core\Framework\Deprecation\BCChange\ParameterTypeNarrowing;

final class LegacyIdLoader
{
    #[ParameterTypeNarrowing(version: 'v6.8.0', parameterName: 'id', newType: 'string')]
    public function load(string|int $id): string
    {
        return (string) $id;
    }
}
