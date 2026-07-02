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

- Add `#[CoversClass(Foo::class)]` on **unit and migration** tests that should count
  toward patch coverage for `src/**` under the `phpunit-unit` flag.
- **Do not** add `#[CoversClass]`, `#[CoversFunction]`, or `#[CoversNothing]` to
  **integration** tests — Shopware PHPStan allows those attributes only on unit and
  migration tests.
- Migration-job Cobertura may **exclude** non-migration `src/` paths — do not
  assume running code during migration tests covers platform classes in Codecov.

## `@codeCoverageIgnore` and integration-only classes

When a class is intentionally covered only by integration tests:

```php
/**
 * @codeCoverageIgnore
 * @see FooIntegrationTest
 */
final class Foo { … }
```

Import the integration test class with `use` — do not FQCN in `@see`. Simple
struct-style classes with only public properties may use `@codeCoverageIgnore`
without unit tests. Details: [`test-shape-and-flags.md`](test-shape-and-flags.md).

## Cross-test references in docblocks

When one test documents that another test covers related behaviour, use **`@see`**
with a **short imported class name** — not a leading-backslash FQCN in prose.

```php
use Shopware\Tests\Unit\Core\Framework\Mcp\McpDiscoveryScanDirsConfigTest;

/**
 * Storefront MCP tool wiring.
 *
 * @see McpDiscoveryScanDirsConfigTest
 */
final class McpStorefrontServiceConfigTest extends TestCase
```

Do **not**:

```php
/**
 * … is covered by
 * \Shopware\Tests\Unit\Core\Framework\Mcp\McpDiscoveryScanDirsConfigTest.
 */
```

Add the `use` statement for the referenced test class; keep the docblock to one
`@see` line when possible.

## Safeguard tests — not in `tests/unit/`

The **unit suite** should contribute to **Codecov patch coverage** when possible.
**Safeguard / config / wiring checks** that intentionally do not cover production
code belong elsewhere — on core, typically **`tests/devops/`** (DevOps PHPUnit
config), not `tests/unit/`.

| Test kind | Placement | Coverage attribute |
| --------- | --------- | ------------------ |
| Behaviour / production code | `tests/unit/` (or integration when kernel needed) | `#[CoversClass(…)]` when patch coverage matters |
| Safeguard, static config, meta-check | `tests/devops/` | `#[CoversNothing]` when the test must not inflate unit metrics |
| Integration contract | `tests/integration/` | No `Covers*` attributes |

If a reviewer asks “can this safeguard test live elsewhere?”, **move it to
`tests/devops/`** (or the project’s non-coverage suite) instead of keeping
`#[CoversNothing]` under `tests/unit/`.

Eval: `safeguard-test-not-in-unit-suite`.

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
