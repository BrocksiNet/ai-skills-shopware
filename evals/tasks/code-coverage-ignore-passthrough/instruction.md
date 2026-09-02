# Task: do not ignore coverage on branching code

`PriceCalculator::calculate()` is marked `@codeCoverageIgnore` but it
branches and throws. That annotation is for pass-through code only.

- Remove `@codeCoverageIgnore` from `calculate()`.
- Keep the public method and the negative-price throw.
- Do not change the test file.
