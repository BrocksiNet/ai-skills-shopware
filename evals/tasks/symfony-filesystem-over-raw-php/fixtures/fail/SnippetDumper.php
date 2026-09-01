<?php declare(strict_types=1);

namespace Shopware\Core\System\Snippet;

use Symfony\Component\Filesystem\Filesystem;

final class SnippetDumper
{
    public function dump(string $path, string $contents): void
    {
        (new Filesystem())->dumpFile($path, $contents);
    }
}
