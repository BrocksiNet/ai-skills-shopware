Write a PHPUnit **unit** test for `fixture/PriceCalculator.php` in a file named
`PriceCalculatorTest.php` placed next to it.

Requirements:
- It must be a true unit test: extend `PHPUnit\Framework\TestCase`, no kernel, no
  database, no container.
- Cover `gross()` for at least the standard case and a zero-tax edge case.
- Use `assertSame` for the numeric assertions.
- Use a data provider for the cases.
