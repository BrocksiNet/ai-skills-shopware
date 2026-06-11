---
name: shopware-testing
description: >-
  PHPUnit standards for Shopware 6 code (unit, integration, migration). Use when
  writing, fixing, or reviewing PHPUnit tests for a Shopware service, DAL flow,
  subscriber, controller, migration, or DTO. Triggers on "write a unit test",
  "generate tests for this class", "integration test for this route", "migration
  test", "add test coverage", "Codecov patch", "this test is flaky", "mock this
  dependency". Do NOT use for storefront E2E/Playwright, Administration Jest,
  manual QA, or non-Shopware PHP testing.
---

# Shopware testing (PHPUnit)

Standards for fast, correct, isolated PHPUnit tests of Shopware code. Used across
all use-cases. Inherits `php-foundation`. Rules are confirmed by *running tests*,
not by claiming compliance.

Load references on demand:

- Unit vs integration placement, assertions, data → this file (below)
- Exception assertions (`expectExceptionObject`) → [`references/exception-assertions.md`](references/exception-assertions.md)
- DAL / repository integration → [`references/integration-repository.md`](references/integration-repository.md)
- shopware/shopware: migrations, Codecov, `#[CoversClass]` → [`references/core-platform-patterns.md`](references/core-platform-patterns.md)
- FoS shopware-phpunit + plugin patterns → [`references/external-inspiration.md`](references/external-inspiration.md)

## Unit vs integration vs migration

| Kind | Path | When |
| ---- | ---- | ---- |
| Unit | `tests/unit/` | No kernel contract required; pure logic with mocks |
| Integration | `tests/integration/` | Container, DAL, HTTP routes, indexers |
| Migration | `tests/migration/` | Schema/data steps in `MigrationStep` classes |

**Unit** (`tests/unit/...`): construct the class under test; mock repos, HTTP,
clock, filesystem. No real DB unless documenting a Codecov placement exception
(see core-platform-patterns).

**Integration** (`tests/integration/...`): `IntegrationTestBehaviour`, real
container + DAL, transaction rollback per test.

**Migration** (`tests/migration/...`): run migration steps against real schema;
assert columns, data transforms, idempotency.

## Rules

- **No real I/O in unit tests** unless the class docblock documents a deliberate
  platform/Codecov exception.
- **`assertSame` over `assertEquals`** for scalars; **`expectExceptionObject`**
  over split exception assertions (see reference).
- **Data providers** (`#[DataProvider]`) for table cases; name cases.
- **Create your own test data** — `Uuid::randomHex()`, `Context::createDefaultContext()`;
  never depend on pre-existing DB rows in integration tests.
- **One behavior per test**; arrange-act-assert; cover the public contract.
- **Deterministic** — no `sleep`, no unordered shared state.

## Platform core extras

- Dedicated test file when Danger/review expects coverage of a new helper class.
- `#[CoversClass]` when patch coverage under the `phpunit-unit` Codecov flag matters.
- Run via project php-tooling (Docker) when available; see core-platform-patterns.

## Definition of done

- [ ] Correct suite (unit / integration / migration).
- [ ] Dependencies mocked in unit tests (unless documented exception).
- [ ] `assertSame` / `expectExceptionObject`; named data providers.
- [ ] Own fixtures in integration tests; deterministic.
- [ ] `vendor/bin/phpunit` (or php-tooling MCP / `docker compose exec web …`) green.

## Further reading

- [Shopware testing docs](https://developer.shopware.com/docs/guides/plugins/plugins/testing)
- [FriendsOfShopware shopware-phpunit](https://github.com/FriendsOfShopware/agent-skills/tree/main/skills/shopware-phpunit) for plugin-heavy patterns
