<?php declare(strict_types=1);

namespace Swag\Loyalty\StoreApi;

use Shopware\Core\Framework\Struct\Struct;

class LoyaltyBalanceStruct extends Struct
{
    public function __construct(
        protected int $points,
        protected string $tier,
    ) {
    }

    public function getPoints(): int
    {
        return $this->points;
    }

    public function getTier(): string
    {
        return $this->tier;
    }

    public function getApiAlias(): string
    {
        return 'swag_loyalty_balance';
    }
}
