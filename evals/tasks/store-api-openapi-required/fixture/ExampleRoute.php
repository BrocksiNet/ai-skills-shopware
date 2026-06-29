<?php declare(strict_types=1);

namespace Smoke\Fixture;

use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

#[Route(defaults: ['_routeScope' => ['store-api']])]
final class ExampleRoute
{
    #[Route(path: '/store-api/example/items', name: 'store-api.example.items', methods: ['GET'])]
    public function list(Request $request): JsonResponse
    {
        return new JsonResponse(['items' => []]);
    }
}
