<?php declare(strict_types=1);

use Swag\MediaCdn\Service\CdnClient;
use Symfony\Component\DependencyInjection\Loader\Configurator\ContainerConfigurator;

return static function (ContainerConfigurator $container): void {
    $services = $container->services()
        ->defaults()
        ->autowire()
        ->autoconfigure();

    $services->set(CdnClient::class)
        ->arg('$httpClient', service('http_client'));
};
