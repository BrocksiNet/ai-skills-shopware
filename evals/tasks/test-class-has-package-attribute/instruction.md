# Task: add Package attribute to test class

Update `CartNormalizerTest.php` for a shopware/shopware contribution:

- Add `#[Package('checkout.cart')]` on the test class (import
  `Shopware\Core\Framework\Log\Package`).
- Keep `#[CoversClass(CartNormalizer::class)]` — the package matches the covered
  production class's package.
- Do not change `CartNormalizer.php` unless required.
