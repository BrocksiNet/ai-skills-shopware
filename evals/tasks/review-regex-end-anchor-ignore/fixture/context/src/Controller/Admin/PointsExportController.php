<?php declare(strict_types=1);

namespace Swag\Loyalty\Controller\Admin;

use Shopware\Core\Framework\Context;
use Shopware\Core\Framework\Log\Package;
use Shopware\Core\Framework\Validation\DataBag\RequestDataBag;
use Swag\Loyalty\Export\PointsCsvExporter;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
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
        defaults: ['_acl' => ['swag_loyalty.points_export']],
        methods: ['POST'],
    )]
    public function export(RequestDataBag $data, Context $context): JsonResponse
    {
        $path = $this->exporter->export('exports/points.csv', $context);

        return new JsonResponse(['path' => $path]);
    }
}
