<?php declare(strict_types=1);

namespace Symfony\Component\DependencyInjection\Loader\Configurator;

use Swag\Loyalty\LoyaltyLedger;
use Swag\Loyalty\Subscriber\LoyaltyPageSubscriber;

return static function (ContainerConfigurator $configurator): void {
    $services = $configurator->services()->defaults()->autowire()->autoconfigure();

    $services->set(LoyaltyLedger::class);
    $services->set(LoyaltyPageSubscriber::class);
};
