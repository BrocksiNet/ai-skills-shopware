<?php declare(strict_types=1);

namespace Shopware\Core\System\Snippet;

/**
 * Historic workaround: synchronous fetch without Symfony HttpClient.
 * The task stages an observable change in failure behavior at the next major.
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
