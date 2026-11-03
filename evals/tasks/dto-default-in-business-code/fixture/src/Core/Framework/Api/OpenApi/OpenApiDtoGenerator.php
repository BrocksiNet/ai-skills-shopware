<?php declare(strict_types=1);

namespace Shopware\Core\Framework\Api\OpenApi;

use Shopware\Core\Framework\Log\Package;

/**
 * Generates request and response DTOs for every operation with x-dto-namespace
 * in the Admin API and Store API schema JSON. Run it with
 * `bin/console open-api:generate-dtos`; `--check` fails on drift.
 *
 * @internal
 */
#[Package('framework')]
final class OpenApiDtoGenerator
{
    // Generator body omitted from this eval fixture.
}
