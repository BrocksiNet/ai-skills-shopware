<?php declare(strict_types=1);

namespace Shopware\Core\Content\Review\SalesChannel;

use Shopware\Core\Framework\Routing\Annotation\Route;
use Shopware\Core\System\SalesChannel\SalesChannelContext;
use Symfony\Component\HttpFoundation\Request;

#[Route(path: '/store-api/product/{productId}/reviews', name: 'store-api.product-review.list', methods: ['POST'])]
class ReviewListRoute
{
    /**
     * Lists the approved reviews of one product.
     */
    public function load(string $productId, Request $request, SalesChannelContext $context): ReviewListResponse
    {
        $criteria = new Criteria();
        $criteria->addFilter(new EqualsFilter('productId', $productId));

        return $this->repository->search($criteria, $context);
    }
}
