<?php declare(strict_types=1);

namespace Shopware\Storefront\Theme;

use League\Flysystem\FilesystemOperator;
use Shopware\Core\Framework\Log\Package;

#[Package('storefront')]
class ThemeCompiler
{
    public function __construct(
        private readonly FilesystemOperator $themeFilesystem,
        private readonly ThemeHashStore $hashStore,
    ) {
    }

    public function compile(string $themeId, string $salesChannelId, string $css): string
    {
        $newHash = hash('xxh3', $css);

        $this->themeFilesystem->write(sprintf('theme/%s/css/all.css', $newHash), $css);
        $this->hashStore->store($themeId, $salesChannelId, $newHash);

        return $newHash;
    }
}
