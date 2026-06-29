<?php declare(strict_types=1);

namespace Smoke\Fixture;

use OpenApi\Attributes as OA;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

#[Route(defaults: ['_routeScope' => ['store-api']])]
final class ExampleRoute
{
    #[Route(path: '/store-api/example/items', name: 'store-api.example.items', methods: ['GET'])]
    #[OA\Get(path: '/store-api/example/items', summary: 'List example items')]
    #[OA\Response(response: 200, description: 'Item list')]
    public function list(Request $request): JsonResponse
    {
        return new JsonResponse(['items' => []]);
    }
}
