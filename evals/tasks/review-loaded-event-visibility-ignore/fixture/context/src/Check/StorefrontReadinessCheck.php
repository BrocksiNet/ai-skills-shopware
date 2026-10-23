<?php declare(strict_types=1);

namespace Swag\ShopHealth\Check;

use Shopware\Core\System\SalesChannel\SalesChannelContext;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\HttpKernelInterface;

/**
 * Requests one category page per sales channel as a customer would and
 * reports the sales channel as broken when the page does not answer 200.
 */
class StorefrontReadinessCheck
{
    public function __construct(
        private readonly CategoryProbe $probe,
        private readonly HttpKernelInterface $kernel,
    ) {
    }

    /**
     * @param list<string> $candidateIds
     */
    public function check(string $domainUrl, array $candidateIds, SalesChannelContext $context): bool
    {
        $categoryId = $this->probe->pick($candidateIds, $context);
        if ($categoryId === null) {
            return true;
        }

        $response = $this->kernel->handle(Request::create($domainUrl . '/navigation/' . $categoryId));

        return $response->getStatusCode() === 200;
    }
}
