<?php declare(strict_types=1);

namespace Swag\Loyalty;

use Shopware\Core\Framework\Struct\ArrayStruct;
use Shopware\Core\System\SalesChannel\SalesChannelContext;

class RewardCatalog
{
    public function rewards(SalesChannelContext $context): ArrayStruct
    {
        // rewards configured for the sales channel
        return new ArrayStruct();
    }

    public function redeemable(string $customerId, SalesChannelContext $context): ArrayStruct
    {
        // rewards the customer has enough points for
        return new ArrayStruct();
    }
}
