<?php declare(strict_types=1);

namespace Swag\Loyalty\Controller\Api;

use Shopware\Core\Framework\Context;
use Shopware\Core\Framework\Log\Package;
use Shopware\Core\Framework\Validation\DataBag\RequestDataBag;
use Shopware\Core\Framework\Validation\DataValidationDefinition;
use Shopware\Core\Framework\Validation\DataValidator;
use Swag\Loyalty\Points\PointsImporter;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Validator\Constraints\Count;
use Symfony\Component\Validator\Constraints\NotBlank;
use Symfony\Component\Validator\Constraints\Type;

#[Route(defaults: ['_routeScope' => ['api']])]
#[Package('checkout')]
class PointsImportController extends AbstractController
{
    public function __construct(
        private readonly PointsImporter $importer,
        private readonly DataValidator $validator,
    ) {
    }

    #[Route(
        path: '/api/_action/swag-loyalty/points-import',
        name: 'api.action.swag-loyalty.points-import',
        defaults: ['_acl' => ['swag_loyalty_points:update']],
        methods: ['POST'],
    )]
    public function import(RequestDataBag $data, Context $context): JsonResponse
    {
        $row = new DataValidationDefinition('swag_loyalty.points_import_row');
        $row->add('customerNumber', new NotBlank(), new Type('string'));
        $row->add('points', new NotBlank(), new Type('int'));

        $definition = new DataValidationDefinition('swag_loyalty.points_import');
        $definition->add('rows', new NotBlank(), new Count(max: 500));
        $definition->addList('rows', $row);

        $this->validator->validate($data->all(), $definition);

        $rows = $data->get('rows');
        \assert($rows instanceof RequestDataBag);

        return new JsonResponse([
            'imported' => $this->importer->import($rows->all(), $context),
        ]);
    }
}
