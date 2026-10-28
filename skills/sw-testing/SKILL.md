---
name: sw-testing
description: >-
  Shopware PHPUnit rules that generic PHPUnit knowledge misses. Load it
  before writing, fixing or changing any PHPUnit test of Shopware code in a
  plugin, project or core, even a small edit: a test method, a data
  provider, a repository stub or mock, an event assertion, a feature flag or
  major-version guard, test attributes, or the suite a test lives in. Also
  use when a test is flaky or failing Codecov. On shopware/shopware,
  shopware-phpunit-tests owns a plain add-a-test request. Do NOT use for
  storefront E2E, Administration Jest, or running the suite (sw-podman-dev).
license: MIT
metadata:
  contexts: core plugin project
  tasks: build review
  paths: "**/tests/**/*Test.php"
  defers_to: shopware-phpunit-tests
---

# Shopware testing (PHPUnit)

Standards for fast, correct, isolated PHPUnit tests of Shopware code. Used across
all use-cases. Inherits `sw-php-foundation`. Rules are confirmed by *running tests*,
not by claiming compliance.

> **Upstream (trunk):** If `.agents/skills/shopware-phpunit-tests/` exists,
> prefer it for test shape, providers, and feature flags. This skill keeps
> plugin/integration patterns and eval-backed trunk rules below.

Read only the reference that matches the task or the files it changes:

<!-- routes:start: generated from routes.json by `node tools/bin/render-routes.ts`; do not edit -->
| Read | When | Or the change touches |
| ---- | ---- | --------------------- |
| [`exception-assertions.md`](references/exception-assertions.md) | A test asserts an exception. | `->expectException(Object\|Message\|Code)?(` |
| [`test-shape-and-flags.md`](references/test-shape-and-flags.md) | You need data providers, feature flags or coverage attributes, or a change edits an assertion. | `#[DataProvider(`, … |
| [`integration-repository.md`](references/integration-repository.md) | An integration test reads or writes through a repository. | `tests/integration/**/*Test.php`, `IntegrationTestBehaviour` |
| [`core-platform-patterns.md`](references/core-platform-patterns.md) | The test lives in shopware/shopware (migrations, Codecov, `#[CoversClass]`). | `tests/migration/**`, `tests/devops/**`, `@codeCoverageIgnore`, … |
| [`external-inspiration.md`](references/external-inspiration.md) | You want plugin test patterns from FriendsOfShopware. | `custom/plugins/*/tests/**`, `custom/static-plugins/*/tests/**` |
<!-- routes:end -->

- Unit vs integration placement, assertions and test data are covered below.

## Unit vs integration vs migration

| Kind | Path | When |
| ---- | ---- | ---- |
| Unit | `tests/unit/` | No kernel contract required; pure logic with mocks |
| Integration | `tests/integration/` | Container, DAL, HTTP routes, indexers |
| Migration | `tests/migration/` | Schema/data steps in `MigrationStep` classes |

**Unit** (`tests/unit/...`): construct the class under test; mock repos, HTTP,
clock, filesystem. No real DB unless documenting a Codecov placement exception
(see core-platform-patterns).

**Integration** (`tests/integration/...`): real container + DAL, transaction
rollback per test. Use only the traits the scenario needs. A repository test
that only needs the container and rollback uses `KernelTestBehaviour` and
`DatabaseTransactionBehaviour`, not the broad `IntegrationTestBehaviour`
bundle. See `integration-repository.md`.

**Migration** (`tests/migration/...`): run migration steps against real schema;
assert columns, data transforms, idempotency.

## Unit-first placement

If the test **does not need** the kernel, container, DAL, or HTTP: it belongs in
`tests/unit/`, not `tests/integration/`. Reviewers routinely request moving pure
logic tests out of the integration suite. See `test-shape-and-flags.md`.

Exception: shopware/shopware sometimes places DB-touching tests under `tests/unit/`
for **Codecov patch coverage** — document why in the class docblock (see
`core-platform-patterns.md`).

## Trunk-enforced rules (shopware/shopware)

These match PHPStan rules and reviewer expectations on core PRs:

- **TEST-001** **`expectExceptionObject` only** — not `expectExceptionMessage()`,
  `expectExceptionCode()`, or string matching on exception text.
- **TEST-002** **No `#[Depends]`** on integration tests; never combine `#[Depends]` with
  `#[DataProvider]` (shuffle-unsafe).
- **TEST-005** **Data providers** — use named **`yield`** cases in unit tests (not `return []`);
  case names describe the scenario; see `test-shape-and-flags.md`.
- **TEST-006** **Feature flags** — unit: `#[DisabledFeatures]` for legacy/off paths (while two
  majors are in flight, disable the **newer** major to assert the older one);
  integration: `Feature::skipTestIfActive()` / `skipTestIfInActive()` —
  **`#[DisabledFeatures]` is rejected at runtime** in the integration suite.
  See reference.
- **TEST-007** **Coverage attrs** — no `#[CoversClass]` on integration tests. See reference.
- **TEST-008** **Cross-test docblocks** (test → test) — `@see OtherTest` with `use` import; no FQCN in prose.
- **TEST-009** **`#[Package('…')]`** on every test class — must match the covered class or a
  package in the mirrored `src/` tree (`TestPackageMatchRule`).
- **TEST-010** **`@internal`** on every test class docblock.
- **TEST-013** **Never `exit()` / `die()`** in a test path; `setAutoExit(false)` on
  `Application::run()`.
- **TEST-014** **Stub DAL with `StaticEntityRepository`**, infer the generic (or `::of()`).
- **TEST-015** **`#[CoversNothing]` safeguard tests** — `tests/devops/` on core, not `tests/unit/`.
- **Events** — no runtime listeners on the shared `event_dispatcher`; observe
  through `CollectingEventDispatcher` (unit) or `EventHookDispatcher::on()`
  (integration), capture in the hook and assert afterwards, never inside it.
  See `test-shape-and-flags.md`.

## Rules

- **TEST-017** **No real I/O in unit tests** unless the class docblock documents a deliberate
  platform/Codecov exception.
- **`assertSame` over `assertEquals`** for scalars; **`expectExceptionObject`**
  over split exception assertions (`TEST-018`, see reference).
- **TEST-019** **No behavior-mocking Doctrine DBAL `Connection`** in unit tests — stub
  collaborators; cover SQL adapters in integration tests.
- **TEST-020** **Create your own test data** — `Uuid::randomHex()`, `Context::createDefaultContext()`;
  never depend on pre-existing DB rows in integration tests.
- **TEST-021** **One behavior per test**; arrange-act-assert; cover the public contract.
- **A test must be able to fail**: no assertions behind a null guard, and a
  mocked callback runs its closure. See `test-shape-and-flags.md`.
- **Keep existing expectations**: a PR that changes code does not flip,
  loosen or skip an old assertion unless it announces the behavior change.
  See `test-shape-and-flags.md`.

## Platform core extras

- Dedicated test file when Danger/review expects coverage of a new helper class.
- `#[CoversClass]` when patch coverage under the `phpunit-unit` Codecov flag matters.
- Run via project php-tooling (Docker) when available; see core-platform-patterns.

## Definition of done

- [ ] Correct suite (unit / integration / migration); pure logic in `tests/unit/`.
- [ ] Dependencies mocked in unit tests (unless documented Codecov exception).
- [ ] `assertSame` / `expectExceptionObject`; no `#[Depends]`; no mock `any()`.
- [ ] Unit providers use named `yield`; integration tests omit `#[CoversClass]`.
- [ ] Test classes carry `#[Package('…')]` and `@internal` when contributing to shopware/shopware.
- [ ] One `#[CoversClass]` per unit/migration file; no reflection into Shopware privates.
- [ ] Own fixtures in integration tests; clock mocked where time matters.
- [ ] Events captured in a hook or owned dispatcher and asserted after the call, never inside the listener.
- [ ] `vendor/bin/phpunit` (or php-tooling MCP / `docker compose exec web …`) green.

## Further reading

- [Shopware testing docs](https://developer.shopware.com/docs/guides/plugins/plugins/testing)
- [FriendsOfShopware shopware-phpunit](https://github.com/FriendsOfShopware/agent-skills/tree/main/skills/shopware-phpunit) for plugin-heavy patterns

## Already enforced by CI (do not repeat)

<!-- enforced:start: generated from rules/catalog.json by `node tools/bin/render-enforced.ts`; do not edit -->
CI already fails the build on 11 checks for this skill's rules. Before you
flag a finding or write a checklist, read [`references/enforced-by-ci.md`](references/enforced-by-ci.md)
and flag only what each check misses.
<!-- enforced:end -->
