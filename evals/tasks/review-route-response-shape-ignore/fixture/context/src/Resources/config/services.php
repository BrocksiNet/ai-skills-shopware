<?php declare(strict_types=1);

use Swag\Loyalty\Points\PointsCalculator;
use Swag\Loyalty\Points\PointsLedger;
use Symfony\Component\DependencyInjection\Loader\Configurator\ContainerConfigurator;

return static function (ContainerConfigurator $container): void {
    $services = $container->services()
        ->defaults()
        ->autowire()
        ->autoconfigure();

    $services->set(PointsLedger::class);
    $services->set(PointsCalculator::class);
};
