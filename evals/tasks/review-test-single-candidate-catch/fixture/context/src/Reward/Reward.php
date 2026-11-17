<?php declare(strict_types=1);

namespace Swag\Loyalty\Reward;

final readonly class Reward
{
    public function __construct(
        public string $id,
        public string $salesChannelId,
        public int $points,
    ) {
    }
}
