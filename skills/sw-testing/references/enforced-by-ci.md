# Already enforced by CI (do not repeat)

<!-- generated from rules/catalog.json by `node tools/bin/render-enforced.ts`; do not edit -->

CI already fails the build on these, so do not repeat them in reviews or
checklists. Flag only what each check misses.
Checks marked *trunk only* are not active in plugin or app projects by
default; there the rule still needs a reviewer.

- `TEST-001` `NoExpectExceptionMessageRule` (PHPStan, trunk only) reports `expectExceptionMessage()` in a test case. It misses `expectExceptionMessageMatches()`, `expectExceptionCode()`, calls in traits or helpers, and it does not ask for `expectExceptionObject()`; flag those.
- `TEST-002` `NoDependsWithDataProviderRule` (PHPStan, trunk only) reports a test method with both `#[Depends]` and `#[DataProvider]`. It misses `#[Depends]` on its own and `@depends` annotations; flag those.
- `TEST-003` `NoAnyInvocationMatcherRule` (PHPStan, trunk only) reports `->expects($this->any())` on a mock. It misses `$this->anything()` inside `with()` and other constraints; flag those.
- `TEST-006` `TestPreparationStartedSubscriber` (PHPUnit, trunk only) fails the run when an integration test method or its class carries `#[DisabledFeatures]`. It misses the attribute on a parent class or trait, and plugin test namespaces; flag those.
- `TEST-006` `NoFeatureSkipInUnitTestsRule` (PHPStan, trunk only) reports `Feature::skipTestIfActive()` and `skipTestIfInActive()`, and a `markTestSkipped()` in any branch of an `if` chain whose conditions call `Feature::isActive()`, in a test class under `Shopware\Tests\Unit\`. It misses integration and other suites, a flag check through a helper or a variable, and plugin test namespaces; flag those.
- `TEST-009` `TestPackageMatchRule` (PHPStan, trunk only) reports a unit test whose `#[Package]` differs from the covered class, and an integration test whose package occurs nowhere in the mirrored `src/` folder. It misses tests without `#[Package]` or with a non-literal value, and covered classes without `#[Package]`; flag those.
- `TEST-009` `MissingPackageAttributeInTests` (Danger, trunk only) fails a PR that adds a `*Test.php` class without `#[Package(`. It misses modified test files, and a `#[Package(` that only appears in a comment; flag those.
- `TEST-010` `InternalClassRule` (PHPStan, trunk only) reports a test class without `@internal` in its docblock. It misses a docblock that only mentions `@internal` in prose, and test classes outside test namespaces whose parent is not `TestCase`; flag those.
- `TEST-013` `CompletionGuard` (PHPUnit) fails the run when code under test calls `exit()` or `die()`. It misses which call exited, exits before PHPUnit starts executing, and projects that do not bootstrap through `TestBootstrapper`; flag those.
- `TEST-016` `NoAssertionInEventHookRule` (PHPStan, trunk only) reports assertions inside a hook passed to `EventHookDispatcher::on()` or a subscriber passed to `subscribe()`. It misses hooks passed as variables or first-class callables, and listeners added to a plain dispatcher; flag those.
- `TEST-016` `NoRuntimeListenerOnSharedEventDispatcherRule` (PHPStan, trunk only) reports `addListener()`, `addSubscriber()` and their `remove*` twins on the shared dispatcher in integration tests. It misses unit tests, and a dispatcher whose native type is the concrete `EventDispatcher`; flag those.
