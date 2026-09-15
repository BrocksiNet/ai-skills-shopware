<?php declare(strict_types=1);

namespace Shopware\Core\System\Snippet;

final class SnippetDumper
{
    public function dump(string $path, string $contents): void
    {
        file_put_contents($path, $contents);
    }
}
