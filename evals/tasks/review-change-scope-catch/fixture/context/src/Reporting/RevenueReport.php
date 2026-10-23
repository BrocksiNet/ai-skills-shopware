<?php declare(strict_types=1);

namespace Swag\OrderTools\Reporting;

class RevenueReport
{
    public function line(string $month, float $revenue): string
    {
        return sprintf('%s: %s', $month, number_format($revenue, 2, ',', '.'));
    }
}
