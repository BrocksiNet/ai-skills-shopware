<?php declare(strict_types=1);

namespace Smoke\Fixture;

final class UserValidator
{
    public function isValidEmail(?string $email): bool
    {
        if (empty($email)) {
            return false;
        }

        return str_contains($email, '@');
    }
}
