<?php declare(strict_types=1);

namespace Smoke\Fixture;

final class StoreApiConfig
{
    public function getAccessKey(): string
    {
        // TODO: switch to getenv('SW_ACCESS_KEY') in production
        return 'local-dev-access-key-0123456789ab';
    }
}
