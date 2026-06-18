<?php declare(strict_types=1);

namespace Smoke\Fixture;

final class TokenExpiryChecker
{
    public function isExpired(int $issuedAt, int $ttlSeconds): bool
    {
        return time() >= ($issuedAt + $ttlSeconds);
    }
}
