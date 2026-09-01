# Test shape, providers, and feature flags

Maintainer-backed patterns from shopware/shopware (aligned with core PR #17657).
Load when restructuring tests, adding data providers, or testing feature-flagged
behavior.

## Test shape

- Write each test as an **executable example**: scenario setup, action, and
  assertions should be easy to follow in the test method body.
- Move **stable boilerplate** (mock services, class under test, command testers,
  temp project roots) into `setUp()` / `tearDown()` so tests focus on what differs
  per scenario.
- Put **reusable fixture collaborators** in `setUp()` when helpers may run more
  than once and callers must see the **same instance or accumulated state**
  (registries, containers, shared filesystem roots). Keep per-scenario mutations in
  the test body or explicit helper parameters.
- **Do not hide assertions** or feature-flag toggles behind abstractions when
  direct assertions are just as readable.
- Prefer **one focused test per distinct exception or behavior** over a broad data
  provider when each case has its own meaning.
- Name arguments when a test helper or data builder is called with bare literals
  (`true`, `false`, `0`, `1`, `[]`, `null`) or when naming lets you skip defaults
  you only passed to reach a later argument.
- A dummy entity definition, stub subscriber, or other fixture class used by
  **exactly one** test file belongs in that file, below the test class. Move it
  into a shared `_fixtures` namespace once a second test needs it.

## Never terminate the test process

A test must never let production or framework code call `exit()`, `die()`, or
`posix_kill()`. PHPUnit is gone before it can report anything.

- When testing a Symfony console `Application`, call `$application->setAutoExit(false)`
  before `run()`. Prefer `CommandTester` unless the scenario needs the application
  layer (resolution, aliases, global options).
- Cover the callable underneath a CLI entry-point script, not the script that
  exits. On trunk, `CompletionGuard` turns a killed process into a loud failure.

## Filesystem in unit tests

- Simple single-file reads/writes: Symfony `Filesystem` injected into the class,
  mocked in the test.
- Several consecutive filesystem calls, realistic paths, or directory structure:
  prefer committed `_fixtures` over building temp files at runtime or over-mocking
  the filesystem.
- When a test **must** write to disk, use Symfony `Filesystem` — not raw
  `mkdir` / `file_put_contents` / `unlink` / `rmdir`.

## DBAL in unit tests

- **Do not behavior-mock** Doctrine DBAL `Connection` in unit tests by asserting
  SQL calls or parameters.
- Stub DBAL-consuming **collaborators** when needed; cover SQL/DBAL adapters in
  **integration** tests.
- Exception: the behaviour under test is a decision whose **only** observable
  effect is the write, and the class offers no other seam. Drive the public
  method, stub reads for data only, capture executed statements in one helper,
  and assert on written **values in domain terms**, never on SQL text. The
  `Connection` double's `transactional()` must invoke its closure or the test
  passes vacuously.

## No reflection into Shopware internals

- Do not invoke private or protected methods of Shopware classes via
  `ReflectionMethod::invoke()` / `invokeArgs()` / `setAccessible()`. Test the
  public API, or extract the logic so it is testable. Fix legacy usages when
  you touch such a test.
- Reflecting into a **third-party** class is acceptable when the vendor API
  leaves no other option. Reading metadata (declaring class, signature,
  attribute) is always fine. PHPStan rule: `shopware.reflectionOnNonPublicMethod`.

## Stubbing DAL repositories

- Stub DAL repositories with
  `Shopware\Core\Test\Stub\DataAbstractionLayer\StaticEntityRepository`, not a
  mock of `EntityRepository`.
- Do not add `/** @var StaticEntityRepository<FooCollection> */` above the
  construction. The generic is inferred when searches contain a typed
  collection or `EntitySearchResult`.
- When no search carries the type (empty searches, id lists, callables), bind
  it with the factory: `StaticEntityRepository::of(FooCollection::class, $searches)`.
- Build search results with the **concrete** collection the consumer expects
  (`new AppCollection([...])`, not `new EntityCollection([...])`).
- Class properties holding the stub keep their `@var StaticEntityRepository<FooCollection>`
  docblock — that is the property type, not an inference crutch.

## Feature flags

### Unit tests

- The **current major feature flag is active by default** in unit tests.
- To test **legacy/off** behavior, disable flags with PHPUnit
  `#[DisabledFeatures(['FLAG_NAME'])]`.
- Do **not** use `Feature::fake()` only to activate the current major flag.

### Integration tests

- Feature-flag state comes from the job configuration (`FEATURE_ALL`, integration-major, etc.).
- **`#[DisabledFeatures]` is rejected at runtime** in the integration suite — the attribute has no effect there and the test runner **fails the run** if a test carries it ([#18350](https://github.com/shopware/shopware/pull/18350)).
- Skip tests explicitly with `Feature::skipTestIfActive('FLAG')` or
  `Feature::skipTestIfInActive('FLAG')` when the current flag value is not what
  the scenario expects.
- Keep **legacy flag behavior** in dedicated tests that are easy to delete when
  the flag is removed.

## Data providers (unit tests)

- Use **named `yield` cases** instead of returning arrays — even for small
  providers.
- Do **not** use `yield from` with an inline array; prefer explicit
  `yield 'human readable case' => [...]` per scenario.
- Case names should explain the **rule being proven** (priority, normalization,
  boundary), not mechanically restate raw input values.
- When removing “duplicate” provider rows, delete only **exact semantic**
  duplicates; keep similar-looking cases that cover distinct edge behavior.

## Package attribute and `@internal`

- Every test class needs `#[Package('…')]` (import `Shopware\Core\Framework\Log\Package`).
- Unit/migration: copy from the `#[CoversClass]` target's package.
  `fundamentals@<area>` counts as equal to `<area>`. A PHPStan rule
  (`TestPackageMatchRule`) fails on mismatches.
- Integration: use a package value that occurs in the mirrored `src/` tree.
  The same rule fails when the value matches none of the packages found there.
- Update the test's package when the covered class moves packages.
- Every test class is marked `@internal` in its class docblock.

Details: `core-platform-patterns.md`.

## Coverage annotations

- **Production class** covered only by integration tests: `@codeCoverageIgnore` plus
  `@see \Fully\Qualified\IntegrationTest` (leading `\` FQCN — do not import the
  test class solely for this annotation). On trunk, defer to core's
  `shopware-phpunit-tests` skill.
- **Cross-test pointers** in **test class** docblocks: `@see OtherTestClass` with
  a `use` import — never a leading-backslash FQCN in prose (see
  `core-platform-patterns.md`).
- **Safeguard / config tests** with `#[CoversNothing]` belong in **`tests/devops/`**
  on core — not `tests/unit/` (keep the unit suite for coverage). See
  `core-platform-patterns.md`.
- **Simple struct-style classes** with only public properties do not need unit
  tests — use `@codeCoverageIgnore` instead.
- Every new class should have focused unit coverage **or** explicit
  `@codeCoverageIgnore` + integration `@see` when unit tests do not make sense.
- **Do not add** `#[CoversClass]`, `#[CoversFunction]`, or `#[CoversNothing]` to
  **integration** tests — Shopware’s PHPStan rule allows those attributes only on
  unit and migration tests.
