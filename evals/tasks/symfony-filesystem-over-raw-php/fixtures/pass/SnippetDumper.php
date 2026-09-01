<?php declare(strict_types=1);

namespace Shopware\Core\System\Snippet;

use Symfony\Component\Filesystem\Filesystem;

final class SnippetDumper
{
    public function __construct(
        private readonly Filesystem $filesystem,
    ) {
    }

    public function dump(string $path, string $contents): void
    {
        $this->filesystem->dumpFile($path, $contents);
    }
}
