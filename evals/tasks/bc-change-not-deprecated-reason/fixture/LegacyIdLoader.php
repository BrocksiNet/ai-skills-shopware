<?php declare(strict_types=1);

namespace Shopware\Core\Content\Product;

final class LegacyIdLoader
{
    /**
     * @deprecated reason: parameter id will become string in v6.8.0
     */
    public function load(string|int $id): string
    {
        return (string) $id;
    }
}
