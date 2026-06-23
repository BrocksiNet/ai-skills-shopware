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

## Filesystem in unit tests

- Simple single-file reads/writes: Symfony `Filesystem` injected into the class,
  mocked in the test.
- Several consecutive filesystem calls, realistic paths, or directory structure:
  prefer committed `_fixtures` over building temp files at runtime or over-mocking
  the filesystem.

## DBAL in unit tests

- **Do not behavior-mock** Doctrine DBAL `Connection` in unit tests by asserting
  SQL calls or parameters.
- Stub DBAL-consuming **collaborators** when needed; cover SQL/DBAL adapters in
  **integration** tests.

## Feature flags

### Unit tests

- The **current major feature flag is active by default** in unit tests.
- To test **legacy/off** behavior, disable flags with PHPUnit
  `#[DisabledFeatures(['FLAG_NAME'])]`.
- Do **not** use `Feature::fake()` only to activate the current major flag.

### Integration tests

- The suite may run **multiple times** with flags on and off.
- For simple legacy/current branching, use `Feature::skipTestIfActive('FLAG')` or
  `Feature::skipTestIfInActive('FLAG')` — **not** `#[DisabledFeatures]`.
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

## Coverage annotations

- If a class is covered **only by integration tests**, mark it with
  `@codeCoverageIgnore` on its own docblock line and add `@see ShortIntegrationTest`
  with a `use` import for the integration test class.
- **Simple struct-style classes** with only public properties do not need unit
  tests — use `@codeCoverageIgnore` instead.
- Every new class should have focused unit coverage **or** explicit
  `@codeCoverageIgnore` + integration `@see` when unit tests do not make sense.
- **Do not add** `#[CoversClass]`, `#[CoversFunction]`, or `#[CoversNothing]` to
  **integration** tests — Shopware’s PHPStan rule allows those attributes only on
  unit and migration tests.
