<?php declare(strict_types=1);

namespace Swag\Restock;

use Shopware\Core\Framework\Context;

final class ProductRestockedEvent
{
    public function __construct(
        public readonly string $productId,
        public readonly int $stock,
        public readonly Context $context,
    ) {
    }
}
