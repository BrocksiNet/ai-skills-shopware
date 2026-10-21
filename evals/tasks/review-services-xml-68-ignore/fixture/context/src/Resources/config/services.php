<?php declare(strict_types=1);

namespace Symfony\Component\DependencyInjection\Loader\Configurator;

use Swag\Loyalty\Service\LoyaltyPointsService;
use Swag\Loyalty\Subscriber\OrderPlacedSubscriber;

return static function (ContainerConfigurator $container): void {
    $services = $container->services()
        ->defaults()
        ->autowire()
        ->autoconfigure();

    $services->set(LoyaltyPointsService::class)
        ->arg('$pointsTransactionRepository', service('swag_loyalty_points_transaction.repository'));

    $services->set(OrderPlacedSubscriber::class);
};
