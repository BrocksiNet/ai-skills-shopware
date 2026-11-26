<?php declare(strict_types=1);

namespace Smoke\Fixture;

use PHPUnit\Framework\TestCase;

final class InvalidQuantityValidatorTest extends TestCase
{
    public function testRejectsZeroQuantity(): void
    {
        // TODO: switch to $this->expectExceptionObject(InvalidQuantityException::notPositive(0));
        $this->expectException(InvalidQuantityException::class);

        (new InvalidQuantityValidator())->validate(0);
    }
}
