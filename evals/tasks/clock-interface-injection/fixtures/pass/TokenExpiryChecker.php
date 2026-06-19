<?php declare(strict_types=1);

namespace Smoke\Fixture;

use Psr\Clock\ClockInterface;

final class TokenExpiryChecker
{
    public function __construct(
        private readonly ClockInterface $clock,
    ) {
    }

    public function isExpired(int $issuedAt, int $ttlSeconds): bool
    {
        return $this->clock->now()->getTimestamp() >= ($issuedAt + $ttlSeconds);
    }
}
