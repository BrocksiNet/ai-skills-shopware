<?php declare(strict_types=1);

namespace Swag\Loyalty\Loyalty;

use Shopware\Core\Checkout\Cart\LineItem\LineItemCollection;
use Shopware\Core\System\SalesChannel\SalesChannelContext;

class LoyaltyPointCalculator
{
    public function __construct(private readonly LoyaltyConfigReader $configReader)
    {
    }

    public function points(LineItemCollection $lineItems, SalesChannelContext $context): int
    {
        $rate = $this->configReader->pointsPerEuro($context->getSalesChannelId());

        return (int) floor($lineItems->getPrices()->sum()->getTotalPrice() * $rate);
    }
}
