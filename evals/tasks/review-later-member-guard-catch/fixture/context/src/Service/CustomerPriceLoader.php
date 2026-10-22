<?php declare(strict_types=1);

namespace Swag\CustomerPrices\Service;

use Shopware\Core\System\SalesChannel\SalesChannelContext;

class CustomerPriceLoader
{
    public const PRICE_GROUP_FIELD = 'swag_price_group_id';

    public function priceGroupId(SalesChannelContext $context): ?string
    {
        $groupId = $context->getCustomer()?->getCustomFields()[self::PRICE_GROUP_FIELD] ?? null;

        return \is_string($groupId) && $groupId !== '' ? $groupId : null;
    }
}
