<?php declare(strict_types=1);

namespace Shopware\Core\Framework\Api\Example;

use Shopware\Core\Framework\Log\Package;
use Shopware\Core\Framework\Routing\StoreApiRouteScope;
use Shopware\Core\PlatformRequest;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;
use Symfony\Component\Routing\Attribute\Route;

/**
 * @internal
 */
#[Package('framework')]
#[Route(defaults: [PlatformRequest::ATTRIBUTE_ROUTE_SCOPE => [StoreApiRouteScope::ID]])]
class ExampleRoute
{
    #[Route(path: '/store-api/example', name: 'store-api.example.create', methods: [Request::METHOD_POST])]
    public function create(#[MapRequestPayload] CreateExampleRequest $payload): CreateExampleResponse
    {
        return new CreateExampleResponse(name: $payload->name);
    }
}
