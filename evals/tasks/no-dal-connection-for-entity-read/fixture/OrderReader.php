<?php declare(strict_types=1);

namespace Smoke\Fixture;

use Shopware\Core\Framework\Context;

final class OrderReader
{
    /**
     * @return list<string>
     */
    public function loadOrderIds(Context $context): array
    {
        return [];
    }
}
