<?php declare(strict_types=1);

namespace Swag\MediaCdn\Service;

use Symfony\Contracts\HttpClient\HttpClientInterface;

class CdnClient
{
    public function __construct(private readonly HttpClientInterface $httpClient)
    {
    }

    /**
     * @param list<string> $mediaIds
     */
    public function purgeMedia(array $mediaIds): void
    {
        if ($mediaIds === []) {
            return;
        }

        $this->httpClient->request('POST', '/purge', ['json' => ['media' => $mediaIds]]);
    }
}
