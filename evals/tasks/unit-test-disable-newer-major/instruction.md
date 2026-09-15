# Task: disable the newer major in a 6.8 unit test

`CartRoundingTest` asserts 6.8 rounding. While two majors are in flight the
unit bootstrap activates both, so this test currently sees 6.9 behaviour.

- Disable the newer major with `#[DisabledFeatures(['v6.9.0.0'])]` on the
  test class or method.
- Do not use `Feature::fake()` to turn the current major on.
- Keep the existing assertion. This is still a unit test.
