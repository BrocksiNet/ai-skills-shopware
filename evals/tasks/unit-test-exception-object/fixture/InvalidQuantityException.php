<?php declare(strict_types=1);

namespace Smoke\Fixture;

final class InvalidQuantityException extends \RuntimeException
{
    public static function notPositive(int $quantity): self
    {
        return new self(sprintf('Quantity must be positive, got %d', $quantity));
    }
}
