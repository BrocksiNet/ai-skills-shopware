<?php declare(strict_types=1);

namespace Smoke\Fixture;

use OpenApi\Attributes as OA;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

#[Route(defaults: ['_routeScope' => ['store-api']])]
final class ExampleRoute
{
    // TODO: add #[OA\Get(path: '/store-api/example/items', summary: 'List example items')]
    #[Route(path: '/store-api/example/items', name: 'store-api.example.items', methods: ['GET'])]
    public function list(Request $request): JsonResponse
    {
        return new JsonResponse(['items' => []]);
    }
}
