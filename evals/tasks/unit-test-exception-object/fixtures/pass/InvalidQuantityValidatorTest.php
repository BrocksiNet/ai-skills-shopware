<?php declare(strict_types=1);

namespace Smoke\Fixture;

use PHPUnit\Framework\TestCase;

final class InvalidQuantityValidatorTest extends TestCase
{
    public function testRejectsZeroQuantity(): void
    {
        $this->expectExceptionObject(InvalidQuantityException::notPositive(0));

        (new InvalidQuantityValidator())->validate(0);
    }
}
