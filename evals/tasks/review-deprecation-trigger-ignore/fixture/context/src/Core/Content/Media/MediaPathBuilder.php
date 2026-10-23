<?php declare(strict_types=1);

namespace Shopware\Core\Content\Media;

use Shopware\Core\Framework\Log\Package;

#[Package('content')]
class MediaPathBuilder
{
    /**
     * @param string $fileName
     */
    public function buildPath(string $mediaId, string $fileName): string
    {
        return sprintf('media/%s/%s', $mediaId, $fileName);
    }
}
