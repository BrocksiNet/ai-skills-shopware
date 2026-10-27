# Task: prepare the cart normalizer test for core

`CartNormalizerTest.php` is a new unit test for a shopware/shopware
contribution. Core CI runs its PHPStan rules on test classes too. Bring the
test class in line with core's conventions so it passes.

- Keep the existing `#[CoversClass]`.
- Do not change `CartNormalizer.php` unless required.
