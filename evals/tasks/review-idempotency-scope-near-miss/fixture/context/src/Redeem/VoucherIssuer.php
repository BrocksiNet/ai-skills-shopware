<?php declare(strict_types=1);

namespace Swag\Loyalty\Redeem;

use Shopware\Core\Checkout\Customer\CustomerEntity;
use Shopware\Core\System\SalesChannel\SalesChannelContext;

/**
 * Turns points into a single-use promotion code and books the points off
 * the customer's balance.
 */
class VoucherIssuer
{
    /**
     * @return array{code: string, value: float, remainingPoints: int}
     */
    public function issue(CustomerEntity $customer, int $points, SalesChannelContext $context): array
    {
        throw new \LogicException('Implemented in the plugin; not needed for the review.');
    }
}
