---
name: shopware-testing
description: >-
  PHPUnit standards for Shopware 6 code (unit and integration). Use when
  writing, fixing, or reviewing PHPUnit tests for a Shopware service, DAL flow,
  subscriber, controller, or DTO. Triggers on "write a unit test", "generate
  tests for this class", "integration test for this route", "add test
  coverage", "this test is flaky", "mock this dependency". Do NOT use for
  storefront end-to-end / Playwright tests, Administration Jest tests, manual
  QA, or non-Shopware PHP testing (those are out of scope here).
---

# Shopware testing (PHPUnit)

Standards for fast, correct, isolated PHPUnit tests of Shopware code. Used by
both profiles. Inherits `php-foundation`. The point of this skill is that rules
are confirmed by *running tests*, not by claiming compliance — so the tests
themselves must be trustworthy.

## Unit vs integration — pick the right kind

Decide before writing. Putting integration concerns in a unit test (or vice
versa) is the most common failure.

- **Unit test** (`tests/unit/...`): no kernel, no database, no container, no real
  HTTP. Construct the class under test directly and pass mocks/stubs/fakes.
  Use for DTOs, value objects, pure services, calculators, subscribers whose
  logic does not need the DAL.
- **Integration test** (`tests/integration/...`): use
  `IntegrationTestBehaviour` (transaction rollback per test), the real container,
  and the DAL. Use for controllers/routes, indexers, message handlers, and
  anything whose contract requires wired-up persistence.

```php
final class PriceCalculatorTest extends TestCase   // unit: extends plain TestCase
{
    public function testRoundsGross(): void
    {
        $calc = new PriceCalculator();
        static::assertSame(11.9, $calc->gross(10.0, 0.19));
    }
}
```

```php
final class ExampleRouteTest extends TestCase       // integration
{
    use IntegrationTestBehaviour;

    public function testReturnsProducts(): void
    {
        $repo = $this->getContainer()->get('product.repository');
        // ... arrange via DAL, act, assert against real behavior
    }
}
```

## Rules

- **No real I/O in unit tests.** Mock repositories, HTTP clients, the system
  clock, the filesystem. A unit test that hits the DB or network is mislabeled.
- **`assertSame` over `assertEquals`** for scalar/identity checks (catches type
  coercion). Reserve `assertEquals` for intentional loose comparison.
- **Data providers** for table-driven cases (`#[DataProvider]`); name the cases.
- **Build test data, do not hardcode brittle fixtures.** Use builders/factories
  and `Context::createDefaultContext()` / `Uuid::randomHex()`; create only the
  data the test needs.
- **One behavior per test**, descriptive method names, arrange-act-assert.
- **Cover the contract**, not the implementation: public behavior, edge cases,
  and error paths the class promises — not private methods.
- **Deterministic**: no `sleep`, no real time/random without injection, no order
  dependence between tests.

## Definition of done

- [ ] Correct suite chosen (unit = no kernel/DB/HTTP; integration = `IntegrationTestBehaviour`).
- [ ] Dependencies mocked in unit tests; no real I/O.
- [ ] `assertSame` for identity; data providers for table cases; cases named.
- [ ] Test data built (not brittle constants); default context / random ids used.
- [ ] Covers public contract incl. edge/error paths; deterministic.
- [ ] `vendor/bin/phpunit` (the relevant suite) passes.

## Further reading (optional, non-load-bearing)

- Shopware developer docs: testing (unit & integration), `IntegrationTestBehaviour`.
- shopwareLabs/ai-coding-tools test-writing rules.
