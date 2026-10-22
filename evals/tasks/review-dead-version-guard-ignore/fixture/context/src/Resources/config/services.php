<?php declare(strict_types=1);

use Swag\ProductFeed\Service\FeedExporter;
use Symfony\Component\DependencyInjection\Loader\Configurator\ContainerConfigurator;

return static function (ContainerConfigurator $container): void {
    $services = $container->services()
        ->defaults()
        ->autowire()
        ->autoconfigure();

    $services->set(FeedExporter::class)
        ->arg('$feedCache', service('cache.object'));
};
