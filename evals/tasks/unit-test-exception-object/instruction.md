# Task: fix exception assertion anti-patterns

Rewrite `InvalidQuantityValidatorTest.php` to follow Shopware unit-test standards:

- Use **`expectExceptionObject()`** with the domain exception factory — not
  `expectException()` + `expectExceptionMessage()`.
- Keep it a **pure unit test** (`TestCase` only — no kernel, no database).
- Use **`assertSame`** if you add return-value assertions.
- Do **not** use `#[Depends]`, mock `any()`, or `assertEquals` for scalars.

Do not change production code unless the test requires it.
