# Task: stop reflecting into a private Shopware method

`PriceCalculatorTest.php` invokes a private method via `ReflectionMethod`.
Update the test so it exercises the public `calculate()` API instead.

- Do not call `ReflectionMethod`, `invoke`, `invokeArgs`, or `setAccessible`.
- Keep the same assertion: `calculate(10.0)` returns `11.0`.
- Do not change `PriceCalculator.php`.
