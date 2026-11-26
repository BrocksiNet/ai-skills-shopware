<?php declare(strict_types=1);

namespace Smoke\Fixture;

use Shopware\Core\Framework\Log\Package;

#[Package('checkout.cart')]
final class CartNormalizer
{
    public function normalize(mixed $lineItem): array
    {
        return ['id' => (string) $lineItem];
    }
}
