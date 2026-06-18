<?php declare(strict_types=1);

namespace Smoke\Fixture;

use PHPUnit\Framework\TestCase;

final class InvalidQuantityValidatorTest extends TestCase
{
    public function testRejectsZeroQuantity(): void
    {
        $this->expectException(InvalidQuantityException::class);
        $this->expectExceptionMessage('Quantity must be positive');

        (new InvalidQuantityValidator())->validate(0);
    }
}
