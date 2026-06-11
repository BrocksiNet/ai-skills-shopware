# Core platform test patterns (shopware/shopware)

Patterns from real shopware/shopware contribution work — especially when CI
Codecov and Danger bot matter.

## Migration tests (`tests/migration/`)

- Run against a real DB schema evolution; assert SQL side effects and data fixes.
- When a migration delegates to a shared helper, add a **focused unit or
  migration test** for that helper — Danger bot often expects a dedicated file,
  not only indirect coverage through the migration class.
- `tearDown()` must restore altered schema/columns if the test narrows or widens
  columns outside the rolled-back migration path.

## DB-backed tests in the `unit` suite

shopware/shopware sometimes places DB-touching tests under `tests/unit/` when CI
**Codecov** only uploads Cobertura from the `unit` and `migration` jobs (not the
integration matrix). Example: `KernelLifecycleManager::getConnection()` in a
unit-suite test with `#[CoversClass(Target::class)]`.

Rules:

- Document in the class docblock **why** it lives in `tests/unit/` (coverage
  flag), not only "it's a unit test".
- Still use real assertions against DB state when that is what you are verifying.
- Prefer a true integration test in `tests/integration/` when Codecov placement
  is not the driver.

## `#[CoversClass]` and patch coverage

- Add `#[CoversClass(Foo::class)]` on tests that should count toward patch
  coverage for `src/**` under the `phpunit-unit` flag.
- Migration-job Cobertura may **exclude** non-migration `src/` paths — do not
  assume running code during migration tests covers platform classes in Codecov.

## Migration + indexer interactions

When migrations change columns that indexers still read in the same upgrade step,
tests may need explicit indexer option skips (e.g. skip `STATES_UPDATER` when
`product.states` was removed). Match `ProductIndexer::getOptions()` to what the
migration test actually runs.

## Running tests locally (Docker)

With `.mcp-php-tooling.json` pointing at `docker-compose` service `web`:

```bash
docker compose exec -T web php -d memory_limit=-1 vendor/bin/phpunit path/to/Test.php
```

Use the same path when MCP php-tooling is unavailable.
