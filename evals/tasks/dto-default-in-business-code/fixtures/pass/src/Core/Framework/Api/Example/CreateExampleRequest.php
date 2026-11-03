<?php declare(strict_types=1);

/**
 * This file is auto-generated.
 * Do not edit manually.
 *
 * Last generated: 2026-11-03 00:00:00
 */

namespace Shopware\Core\Framework\Api\Example;

use Shopware\Core\Framework\Api\Request\AbstractRequest;
use Shopware\Core\Framework\Log\Package;
use Symfony\Component\Validator\Constraints as Assert;

/**
 * @internal
 *
 * @codeCoverageIgnore
 */
#[Package('framework')]
final class CreateExampleRequest extends AbstractRequest
{
    public const DEFAULT_NOTE = 'No note given';

    public ?string $note;

    /**
     * @internal
     */
    public function __construct(
        #[Assert\NotNull]
        #[Assert\Length(min: 1)]
        public string $name,
    ) {
    }
}
