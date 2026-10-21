<?php declare(strict_types=1);

namespace Swag\Loyalty\Idempotency;

use Doctrine\DBAL\Connection;

/**
 * Remembers the response of a write for 24 hours, so a client that retries
 * with the same Idempotency-Key gets the first answer again.
 */
class IdempotencyStore
{
    public function __construct(private readonly Connection $connection)
    {
    }

    /**
     * @return array<string, mixed>|null
     */
    public function find(string $key): ?array
    {
        $json = $this->connection->fetchOne(
            'SELECT response FROM swag_loyalty_idempotency WHERE idempotency_key = :key AND created_at > NOW(3) - INTERVAL 1 DAY',
            ['key' => $key],
        );

        return \is_string($json) ? json_decode($json, true, 512, \JSON_THROW_ON_ERROR) : null;
    }

    /**
     * @param array<string, mixed> $response
     */
    public function save(string $key, array $response): void
    {
        $this->connection->insert('swag_loyalty_idempotency', [
            'idempotency_key' => $key,
            'response' => json_encode($response, \JSON_THROW_ON_ERROR),
            'created_at' => (new \DateTimeImmutable())->format('Y-m-d H:i:s.v'),
        ]);
    }
}
