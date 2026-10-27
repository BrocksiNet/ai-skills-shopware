# Task: fix the price calculator test

`PriceCalculatorTest.php` is a shopware/shopware unit test. Core review
rejected how it tests the tax calculation. Fix it.

- Keep checking, with `assertSame`, that a net of `10.0` becomes `11.0`.
- Do not change `PriceCalculator.php`.
