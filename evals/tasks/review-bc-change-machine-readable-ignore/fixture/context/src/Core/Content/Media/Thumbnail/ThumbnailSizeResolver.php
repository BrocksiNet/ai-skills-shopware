<?php declare(strict_types=1);

namespace Shopware\Core\Content\Media\Thumbnail;

use Shopware\Core\Framework\Log\Package;

#[Package('buyers-experience')]
class ThumbnailSizeResolver
{
    /**
     * @return array{0: int, 1: int}
     */
    public function resolve(string|int $size): array
    {
        if (is_int($size)) {
            return [$size, $size];
        }

        $parts = explode('x', $size, 2);

        return [(int) $parts[0], (int) ($parts[1] ?? $parts[0])];
    }
}
