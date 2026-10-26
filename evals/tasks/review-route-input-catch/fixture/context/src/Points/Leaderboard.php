<?php declare(strict_types=1);

namespace Swag\Loyalty\Points;

use Shopware\Core\Framework\DataAbstractionLayer\EntityRepository;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Criteria;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Sorting\FieldSorting;
use Shopware\Core\Framework\Log\Package;
use Shopware\Core\System\SalesChannel\SalesChannelContext;

#[Package('checkout')]
class Leaderboard
{
    public function __construct(private readonly EntityRepository $pointsRepository)
    {
    }

    /**
     * @return list<array{nickname: ?string, points: int}>
     */
    public function top(int $limit, int $offset, SalesChannelContext $context): array
    {
        $criteria = new Criteria();
        $criteria->addSorting(new FieldSorting('points', FieldSorting::DESCENDING));
        $criteria->setLimit($limit);
        $criteria->setOffset($offset);

        $ranking = [];

        foreach ($this->pointsRepository->search($criteria, $context->getContext())->getEntities() as $entity) {
            $ranking[] = ['nickname' => $entity->getNickname(), 'points' => $entity->getPoints()];
        }

        return $ranking;
    }
}
