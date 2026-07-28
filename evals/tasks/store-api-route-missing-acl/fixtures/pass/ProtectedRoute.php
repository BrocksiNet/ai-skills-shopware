<?php declare(strict_types=1);

namespace Smoke\Fixture;

use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

#[Route(defaults: ['_acl' => ['example:export']])]
final class ProtectedRoute
{
    #[Route(path: '/api/example/export', name: 'api.example.export', methods: ['POST'])]
    public function export(): JsonResponse
    {
        return new JsonResponse(['status' => 'ok']);
    }
}
