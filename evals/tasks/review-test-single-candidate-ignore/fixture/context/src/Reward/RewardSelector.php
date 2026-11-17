<?php declare(strict_types=1);

namespace Swag\Loyalty\Reward;

class RewardSelector
{
    /**
     * Picks the reward configured for the sales channel the customer shops in.
     *
     * @param list<Reward> $rewards all active rewards, across sales channels
     */
    public function forSalesChannel(array $rewards, string $salesChannelId): ?Reward
    {
        foreach ($rewards as $reward) {
            if ($reward->salesChannelId === $salesChannelId) {
                return $reward;
            }
        }

        return null;
    }
}
