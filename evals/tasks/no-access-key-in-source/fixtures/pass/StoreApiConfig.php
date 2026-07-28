<?php declare(strict_types=1);

namespace Smoke\Fixture;

final class StoreApiConfig
{
    public function getAccessKey(): string
    {
        $key = getenv('SW_ACCESS_KEY');
        if ($key === false || $key === '') {
            throw new \RuntimeException('Set SW_ACCESS_KEY in environment for local dev');
        }

        return $key;
    }
}
