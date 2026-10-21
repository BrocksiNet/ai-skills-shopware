<?php declare(strict_types=1);

namespace Swag\GiftCard;

use Shopware\Core\Framework\Context;

final class GiftCardRedeemedEvent
{
    public function __construct(
        public readonly string $code,
        public readonly int $amountInCents,
        public readonly Context $context,
    ) {
    }
}
