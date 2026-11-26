<?php declare(strict_types=1);

namespace Smoke\Fixture;

final class InvalidQuantityValidator
{
    public function validate(int $quantity): void
    {
        if ($quantity <= 0) {
            throw InvalidQuantityException::notPositive($quantity);
        }
    }
}
