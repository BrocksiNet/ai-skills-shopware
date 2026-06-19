<?php declare(strict_types=1);

namespace Shopware\Core\System\Snippet;

use Shopware\Core\Framework\Feature;
use Symfony\Contracts\HttpClient\HttpClientInterface;

final class RemoteSnippetFetcher
{
    public function __construct(
        private readonly HttpClientInterface $httpClient,
    ) {
    }

    public function fetch(string $url): string
    {
        if (Feature::isActive('v6.8.0')) {
            return $this->httpClient->request('GET', $url)->getContent();
        }

        $content = @file_get_contents($url);
        if ($content === false) {
            throw new \RuntimeException(sprintf('Could not fetch snippet from %s', $url));
        }

        return $content;
    }
}
