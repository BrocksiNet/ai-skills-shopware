<?php declare(strict_types=1);

namespace Shopware\Core\Framework\Adapter\Cache;

use Shopware\Core\Framework\Log\Package;
use Symfony\Component\Cache\Adapter\AdapterInterface;
use Symfony\Component\Cache\Adapter\FilesystemAdapter;

/**
 * @internal
 */
#[Package('core')]
class CacheBackendFactory
{
    public function __construct(private readonly string $cacheDir)
    {
    }

    public function create(string $namespace, int $lifetime): AdapterInterface
    {
        return new FilesystemAdapter($namespace, $lifetime, $this->cacheDir);
    }
}
