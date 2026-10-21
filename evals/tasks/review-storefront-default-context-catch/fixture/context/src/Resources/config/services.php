<?php declare(strict_types=1);

namespace Symfony\Component\DependencyInjection\Loader\Configurator;

use Swag\Loyalty\Service\LoyaltyPointsService;
use Swag\Loyalty\Service\LoyaltyTierResolver;
use Swag\Loyalty\Storefront\Pagelet\LoyaltyHighlights\LoyaltyHighlightsPageletLoader;

return static function (ContainerConfigurator $container): void {
    $services = $container->services()
        ->defaults()
        ->autowire()
        ->autoconfigure();

    $services->set(LoyaltyPointsService::class)
        ->arg('$pointsTransactionRepository', service('swag_loyalty_points_transaction.repository'));

    $services->set(LoyaltyTierResolver::class)
        ->arg('$tierRepository', service('swag_loyalty_tier.repository'));

    $services->set(LoyaltyHighlightsPageletLoader::class)
        ->arg('$productRepository', service('sales_channel.product.repository'));
};
