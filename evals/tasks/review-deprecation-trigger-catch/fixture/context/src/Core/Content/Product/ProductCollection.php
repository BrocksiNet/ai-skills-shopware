<?php declare(strict_types=1);

namespace Shopware\Core\Content\Product;

use Shopware\Core\Framework\DataAbstractionLayer\EntityCollection;
use Shopware\Core\Framework\Log\Package;

#[Package('inventory')]
class ProductCollection extends EntityCollection
{
    public function filterActive(): self
    {
        return new self(array_filter(
            $this->getElements(),
            static fn (ProductEntity $product): bool => $product->getActive()
        ));
    }

    /**
     * @return list<ProductEntity>
     */
    public function getActiveProducts(): array
    {
        return array_values($this->filterActive()->getElements());
    }
}
