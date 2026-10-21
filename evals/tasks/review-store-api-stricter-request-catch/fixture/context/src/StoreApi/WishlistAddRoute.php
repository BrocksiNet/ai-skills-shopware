<?php declare(strict_types=1);

namespace Swag\Wishlist\StoreApi;

use Shopware\Core\Framework\Log\Package;
use Shopware\Core\Framework\Validation\DataBag\RequestDataBag;
use Shopware\Core\Framework\Validation\DataValidationDefinition;
use Shopware\Core\Framework\Validation\DataValidator;
use Shopware\Core\System\SalesChannel\NoContentResponse;
use Shopware\Core\System\SalesChannel\SalesChannelContext;
use Swag\Wishlist\WishlistService;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Validator\Constraints\Choice;
use Symfony\Component\Validator\Constraints\NotBlank;
use Symfony\Component\Validator\Constraints\Uuid;

#[Route(defaults: ['_routeScope' => ['store-api'], '_loginRequired' => true])]
#[Package('checkout')]
class WishlistAddRoute
{
    public function __construct(
        private readonly WishlistService $wishlist,
        private readonly DataValidator $validator,
    ) {
    }

    #[Route(path: '/store-api/swag-wishlist/add', name: 'store-api.swag-wishlist.add', methods: ['POST'])]
    public function add(RequestDataBag $data, SalesChannelContext $context): NoContentResponse
    {
        $definition = new DataValidationDefinition('swag_wishlist.add');
        $definition->add('productId', new NotBlank(), new Uuid(['strict' => false]));
        $definition->add('list', new Choice(['choices' => ['default', 'gift', 'later']]));
        $this->validator->validate($data->all(), $definition);

        $this->wishlist->add(
            $data->getString('productId'),
            $data->getString('list', 'default'),
            $context,
        );

        return new NoContentResponse();
    }
}
