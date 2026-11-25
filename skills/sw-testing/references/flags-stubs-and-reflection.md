# Feature flags, DAL stubs, and reflection in tests

Maintainer-backed patterns from shopware/shopware (aligned with core PR #17657).
Load when testing feature-flagged behavior, stubbing DAL repositories, or
dealing with reflection in tests.

For `#[Package]`, `@internal`, and `#[CoversClass]` / coverage annotations on
core tests, see [`core-platform-patterns.md`](core-platform-patterns.md).

## Feature flags

- **TEST-006** Unit tests disable legacy/off flags with `#[DisabledFeatures]`;
  integration tests skip with `Feature::skipTestIfActive()` /
  `Feature::skipTestIfInActive()` — never `#[DisabledFeatures]`.

### Unit tests

- The **current major feature flag is active by default** in unit tests.
- To test **legacy/off** behavior, disable flags with PHPUnit
  `#[DisabledFeatures(['FLAG_NAME'])]`.
- Do **not** use `Feature::fake()` only to activate the current major flag.
- While **two majors are in flight**, the unit bootstrap activates both. A test
  that asserts the older major's behaviour must disable the newer one, e.g.
  `#[DisabledFeatures(['v6.9.0.0'])]` ([#20117](https://github.com/shopware/shopware/pull/20117)).

### Integration tests

- Feature-flag state comes from the job configuration (`FEATURE_ALL`,
  integration-major, etc.).
- While more than one major is in flight, `integration-major` runs **one lane
  per major** with `FEATURE_ALL=<major>` (for example `v6.8.0.0`), not
  `FEATURE_ALL=major`. Reproducing a failing job with `major` would mix the
  next major in.
- **`#[DisabledFeatures]` is rejected at runtime** in the integration suite — the
  attribute has no effect there and the test runner **fails the run** if a test
  carries it ([#18350](https://github.com/shopware/shopware/pull/18350)).
- Skip tests explicitly with `Feature::skipTestIfActive('FLAG')` or
  `Feature::skipTestIfInActive('FLAG')` when the current flag value is not what
  the scenario expects. Pin against the extra in-flight major with
  `Feature::skipTestIfActive('v6.9.0.0', $this)` rather than `#[DisabledFeatures]`.
- **TEST-031** Keep **legacy flag behavior** in dedicated tests that are easy to delete when
  the flag is removed.

## Stubbing DAL repositories

- **TEST-014** Stub DAL repositories with
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

## No reflection into Shopware internals

- Do not invoke private or protected methods of Shopware classes via
  `ReflectionMethod::invoke()` / `invokeArgs()` / `setAccessible()`. Test the
  public API, or extract the logic so it is testable. Fix legacy usages when
  you touch such a test.
- Reflecting into a **third-party** class is acceptable when the vendor API
  leaves no other option. Reading metadata (declaring class, signature,
  attribute) is always fine. PHPStan rule: `shopware.reflectionOnNonPublicMethod`.
