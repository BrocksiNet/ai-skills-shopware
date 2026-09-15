<?php declare(strict_types=1);

use SwagExample\ProductLoader;
use Symfony\Component\DependencyInjection\Loader\Configurator\ContainerConfigurator;

return static function (ContainerConfigurator $container): void {
    $container->services()
        ->set(ProductLoader::class)
        ->autowire()
        ->autoconfigure();
};
