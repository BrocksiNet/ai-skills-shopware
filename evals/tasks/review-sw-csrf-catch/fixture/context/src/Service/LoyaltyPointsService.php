<?php declare(strict_types=1);

namespace Swag\Loyalty\Service;

use Shopware\Core\Framework\Context;
use Shopware\Core\Framework\DataAbstractionLayer\EntityRepository;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Criteria;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Filter\EqualsFilter;
use Shopware\Core\Framework\Uuid\Uuid;

class LoyaltyPointsService
{
    public function __construct(
        private readonly EntityRepository $pointsTransactionRepository,
    ) {
    }

    public function getBalance(string $customerId, Context $context): int
    {
        $criteria = new Criteria();
        $criteria->addFilter(new EqualsFilter('customerId', $customerId));

        $balance = 0;
        foreach ($this->pointsTransactionRepository->search($criteria, $context)->getEntities() as $transaction) {
            $balance += $transaction->get('points');
        }

        return $balance;
    }

    public function redeem(string $customerId, int $points, Context $context): void
    {
        if ($points <= 0 || $points > $this->getBalance($customerId, $context)) {
            throw new \InvalidArgumentException('Not enough loyalty points.');
        }

        $this->pointsTransactionRepository->create([[
            'id' => Uuid::randomHex(),
            'customerId' => $customerId,
            'points' => -$points,
            'reason' => 'redeem',
        ]], $context);
    }
}
