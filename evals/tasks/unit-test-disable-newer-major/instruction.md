# Task: fix the 6.8 rounding test

`CartRoundingTest` is a shopware/shopware unit test that asserts 6.8 rounding.
While 6.8 and 6.9 are both in development, the unit bootstrap activates both
majors, so the test currently sees 6.9 behaviour and fails.

Make the test run against 6.8 behaviour. Keep the existing assertions, and keep
it a unit test.
