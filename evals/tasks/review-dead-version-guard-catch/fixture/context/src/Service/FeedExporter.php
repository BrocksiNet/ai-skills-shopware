<?php declare(strict_types=1);

namespace Swag\ProductFeed\Service;

use Symfony\Contracts\Cache\ItemInterface;
use Symfony\Contracts\Cache\TagAwareCacheInterface;

class FeedExporter
{
    public const CACHE_TAG = 'swag-product-feed';

    public function __construct(private readonly TagAwareCacheInterface $feedCache)
    {
    }

    /**
     * @param array<string, mixed> $payload
     */
    public function export(string $feedId, array $payload): string
    {
        return $this->feedCache->get('swag-product-feed-' . $feedId, function (ItemInterface $item) use ($payload): string {
            $item->tag(self::CACHE_TAG);

            return $this->render($payload);
        });
    }

    /**
     * @param array<string, mixed> $payload
     */
    private function render(array $payload): string
    {
        return '<feed>' . htmlspecialchars((string) json_encode($payload, \JSON_THROW_ON_ERROR)) . '</feed>';
    }
}
