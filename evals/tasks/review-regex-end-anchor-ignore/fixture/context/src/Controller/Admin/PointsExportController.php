<?php declare(strict_types=1);

namespace Swag\Loyalty\Controller\Admin;

use Shopware\Core\Framework\Context;
use Shopware\Core\Framework\Log\Package;
use Swag\Loyalty\Export\PointsCsvExporter;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

#[Route(defaults: ['_routeScope' => ['api']])]
#[Package('checkout')]
class PointsExportController extends AbstractController
{
    public function __construct(private readonly PointsCsvExporter $exporter)
    {
    }

    #[Route(
        path: '/api/_action/swag-loyalty/export-points',
        name: 'api.action.swag-loyalty.export-points',
        defaults: ['_acl' => ['swag_loyalty_points:read']],
        methods: ['POST'],
    )]
    public function export(Request $request, Context $context): JsonResponse
    {
        $path = $this->exporter->export('exports/points.csv', $context);

        return new JsonResponse(['path' => $path]);
    }
}
