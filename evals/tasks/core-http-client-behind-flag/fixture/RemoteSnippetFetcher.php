<?php declare(strict_types=1);

namespace Shopware\Core\System\Snippet;

/**
 * Historic workaround: synchronous fetch without Symfony HttpClient.
 * Platform modernization should replace this internally, not delete it in one step.
 */
final class RemoteSnippetFetcher
{
    public function fetch(string $url): string
    {
        $content = @file_get_contents($url);
        if ($content === false) {
            throw new \RuntimeException(sprintf('Could not fetch snippet from %s', $url));
        }

        return $content;
    }
}
