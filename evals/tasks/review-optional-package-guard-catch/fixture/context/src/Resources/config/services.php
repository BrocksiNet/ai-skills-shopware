<?php declare(strict_types=1);

use Composer\InstalledVersions;
use Swag\Loyalty\Controller\Api\PointsImportController;
use Swag\Loyalty\Points\PointsCalculator;
use Swag\Loyalty\Points\PointsLedger;
use Swag\Loyalty\Storefront\Subscriber\AccountMenuBalanceSubscriber;
use Symfony\Component\DependencyInjection\Loader\Configurator\ContainerConfigurator;

use function Symfony\Component\DependencyInjection\Loader\Configurator\service;

return static function (ContainerConfigurator $container): void {
    $services = $container->services()
        ->defaults()
        ->autowire()
        ->autoconfigure();

    $services->set(PointsLedger::class);
    $services->set(PointsCalculator::class);

    $services->set(PointsImportController::class)
        ->public()
        ->call('setContainer', [service('service_container')]);

    if (InstalledVersions::isInstalled('shopware/storefront')) {
        $services->set(AccountMenuBalanceSubscriber::class);
    }
};
