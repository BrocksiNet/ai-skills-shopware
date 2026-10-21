<?php declare(strict_types=1);

namespace Symfony\Component\DependencyInjection\Loader\Configurator;

use Swag\Loyalty\Tier\TierPageLoader;

return static function (ContainerConfigurator $configurator): void {
    $services = $configurator->services()->defaults()->autowire()->autoconfigure();

    $services->set(TierPageLoader::class)
        ->arg('$tierRepository', service('swag_loyalty_tier.repository'));
};
