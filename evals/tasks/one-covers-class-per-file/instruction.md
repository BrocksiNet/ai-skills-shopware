# Task: one CoversClass per test file

Update `CartNormalizerTest.php` for a shopware/shopware unit test:

- Keep a single `#[CoversClass(CartNormalizer::class)]`.
- Remove the extra `#[CoversClass(LineItemHelper::class)]`. A second class
  needs its own test file.
- Do not change `CartNormalizer.php` or `LineItemHelper.php`.
