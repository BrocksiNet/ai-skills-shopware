# Task: remove CoversClass from integration test

Fix `ProductLoaderIntegrationTest.php` for Shopware core PHPUnit rules:

- Remove **`#[CoversClass]`** (and `CoversFunction` / `CoversNothing` if present) — those
  attributes belong on **unit/migration** tests only, not integration tests.
- Keep it an **integration test** (`IntegrationTestBehaviour`, `TestCase`).
- Keep **`assertSame`** for assertions.

Do not change `ProductLoader.php`.
