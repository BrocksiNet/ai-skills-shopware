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
- **Exactly one** `#[CoversClass]` per test file — the covered class owns the
  test. A second class needs a second test file. Danger fails new test files
  that cover more than one class.
- **Do not** add `#[CoversClass]`, `#[CoversFunction]`, or `#[CoversNothing]` to
  **integration** tests — Shopware PHPStan allows those attributes only on unit and
  migration tests.
- Migration-job Cobertura may **exclude** non-migration `src/` paths — do not
  assume running code during migration tests covers platform classes in Codecov.

## `@codeCoverageIgnore` on production classes

When a **production class** is intentionally covered only by integration tests,
mark it on the class docblock:

```php
/**
 * @codeCoverageIgnore
 * @see \Shopware\Tests\Integration\Core\Checkout\Cart\CartNormalizerIntegrationTest
 */
final class CartNormalizer { … }
```

On **shopware/shopware trunk**, use a **leading-backslash FQCN** in `@see` — do
not add a `use` import for the test class solely for this annotation. The
referenced test must be a **dedicated** integration test for that production
class.

Simple struct-style classes with only public properties may use
`@codeCoverageIgnore` without unit tests.

`@codeCoverageIgnore` is for **pass-through** code only. On trunk, PHPStan
(`CodeCoverageIgnoreEvaluationRule`) fails annotated methods that branch, throw,
mutate a value (`unset`, `+=`, `.=`, `++`, a second write to a local), call
`$this->…()` / `self::…()` for effect, call a method on a parameter for effect
(`$criteria->addFilter(...)`; entity extensions adding fields are exempt), or
configure the parent constructor with a literal the parent does not share.
Write a unit test instead, or point `@see` at a dedicated integration or devops
test.

> **Trunk:** defer this style to `.agents/skills/shopware-phpunit-tests/`. Our
> full-install profile keeps the rule for contributors on older branches.

## Cross-test references in **test** docblocks

When one **test class** documents that another test covers related behaviour,
use **`@see`** with a **short imported class name** — not a leading-backslash FQCN
in prose.

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

Eval: `test-docblock-use-see` (test-to-test pointers only).

## `#[Package('…')]` on test classes

Every **new test class** on shopware/shopware needs `#[Package('…')]` (import
`Shopware\Core\Framework\Log\Package`) so failing CI jobs — especially nightlies —
route to the owning domain team. A Danger rule fails PRs that add test classes
without it.

| Suite | Where the package value comes from |
| ----- | ---------------------------------- |
| Unit / migration | Copy from the `#[CoversClass]` target's `#[Package]` |
| Integration | Dominant `#[Package]` of the mirrored `src/` tree (e.g. `tests/integration/Core/Checkout/Cart/…` → package of `src/Core/Checkout/Cart`) |

When a covered class moves packages, update the test's `#[Package]` in the same
change. `fundamentals@<area>` counts as equal to `<area>`. PHPStan
`TestPackageMatchRule` fails mismatches (unit/migration) and integration values
that occur in none of the mirrored `src/` packages.

Every test class also needs an `@internal` class docblock.

Eval: `test-class-has-package-attribute`, `test-class-marked-internal`.

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
