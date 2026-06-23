# Task: use named yield in unit data provider

Refactor `PriceCalculatorTest.php` so the data provider follows Shopware unit-test
standards:

- Replace the **`return [ … ]` array** in `grossCases()` with **named `yield` cases**.
- Keep one explicit `yield 'case name' => [ … ]` per scenario.
- Do **not** use `yield from` with an inline array.
- Keep it a **unit test** (`TestCase` only) with `assertSame` and `#[DataProvider]`.

Do not change `PriceCalculator.php` unless required.
