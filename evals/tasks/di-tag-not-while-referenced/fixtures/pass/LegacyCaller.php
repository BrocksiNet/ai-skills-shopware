<?php declare(strict_types=1);

namespace Swag\Example;

final class LegacyCaller
{
    public function __construct(
        private readonly LegacyLoader $loader,
    ) {
    }
}
