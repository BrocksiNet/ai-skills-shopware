# Task: fix the exception test

`InvalidQuantityValidatorTest.php` is a unit test for a shopware/shopware
contribution. Core review rejected the way it checks the thrown exception.
Fix the test.

- Keep it a pure unit test (no kernel, no database).
- Do not change production code unless the test requires it.
