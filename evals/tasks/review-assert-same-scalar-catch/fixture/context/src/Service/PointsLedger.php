<?php declare(strict_types=1);

namespace Swag\Loyalty\Service;

interface PointsLedger
{
    public function sumFor(string $customerId): string;
}
