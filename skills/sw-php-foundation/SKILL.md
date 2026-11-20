---
name: sw-php-foundation
description: >-
  The strict, modern PHP 8.x baseline for Shopware code. Load it before
  writing or refactoring any PHP class in a Shopware plugin, app, or core,
  even a small edit: constructor injection and the types it takes, enums
  versus constants, empty() and other loose checks, time() or date() versus
  a clock, DTOs, immutability, named arguments, coding style (PER-CS), or a
  PHPStan type error. Do NOT use for non-PHP work (Twig-only, Vue/JS/SCSS),
  for PHPUnit test authoring (use sw-testing), or for Shopware-specific
  framework topics like DAL, cache, or migrations (use the surface skills).
license: MIT
metadata:
  contexts: core plugin project
  tasks: build review
  paths: "**/*.php"
---

# PHP foundation (Shopware-aligned)

The shared PHP baseline every Shopware use-case inherits. It encodes only what
models get wrong *in practice* for Shopware codebases — not a generic PHP
tutorial. The surface skills (`sw-core-development`,
`sw-plugin-development`) define framework contracts and surface-specific choices,
including when DTOs and events must stay mutable.

## Non-negotiable baseline

- **PHP-003** Put `declare(strict_types=1);` at the top of every PHP file, after
  the opening tag. Every parameter, return, and property is typed. No
  untyped `array` where a shape is known — type it or model it (see below).
- **PHP-004** Put `#[\Override]` on every method that overrides a parent or implements an
  interface (PHP 8.3+).
- **PHP-005** Reference classes via `use` imports, not
  inline `\Vendor\Namespace\Class` in the body.
- **PHP-006** Follow PER Coding Style (the successor to PSR-12). Shopware enforces this via
  EasyCodingStandard (`ecs.php`); run it, do not hand-format.

## Shopware trunk habits (review-backed)

Patterns `mitelg` and `nfortier-shopware` flag repeatedly on `shopware/shopware`
PRs. They are required on trunk and worth following in plugins and projects:

- **PHP-001** **No `empty()`.** Use explicit checks (`=== null`, `=== ''`, `=== []`, typed
  `count()`). In tests, prefer PHPUnit `assertEmpty()` / `assertNotEmpty()` over
  `empty()` in assertions.
- **PHP-007** Inject an existing supported interface when the service provides
  one, such as `Psr\Log\LoggerInterface` or `ClockInterface`. Modern Shopware DAL
  intentionally injects `EntityRepository` (for example `product.repository`):
  `EntityRepositoryInterface` was removed in 6.5, and there is no built-in
  `ProductRepositoryInterface`. Do not invent an interface to satisfy this
  preference. See the [6.5 migration guide](https://github.com/shopware/shopware/blob/trunk/UPGRADE-6.5.md#entityrepositoryinterface-removal).
- **PHP-008** Inject `Psr\Clock\ClockInterface` for time; do not call
  `time()`, `microtime()`, or `new \DateTimeImmutable()` in domain/services for
  “now”. Tests mock the clock — no fuzzy `time()` comparisons.
- **PHP-009** No `@var` on properties when a native property type or method-level
  `@return`/`@param` generic suffices. PHPDoc is for shapes PHP cannot express,
  not a shortcut around typing.
- **PHP-010** Name the arguments when a call passes several values that do not describe
  themselves — `true`, `false`, `0`, `1`, `[]`, `null` — or when naming lets you
  skip defaults you only passed in order to reach a later argument. Leave a
  short, self-explaining call positional.

## Use the right shape for data

- **PHP-011** Use a DTO or Value Object for a meaningful domain concept, a real
  boundary, or a simpler public contract. Keep simple internal handoffs as
  scalars or arrays with PHPDoc shapes; known keys alone do not justify a new
  class. Core's `CORE-057` in `sw-core-development` owns its stricter design
  guidance, and `sw-openapi-dto` owns generated API DTO contracts.

| Instead of | Use |
| ---------- | --- |
| untyped internal array with known keys | an `array{...}` PHPDoc shape |
| array carrying a meaningful boundary contract | a DTO / Value Object |
| `const STATE_OPEN = 'open'` + sibling constants | a backed `enum` |
| `['open', 'closed', 'paid']` | `enum`-typed values / `Enum::cases()` |
| complex result crossing a public boundary | a typed result object when it simplifies the contract |

```php
<?php declare(strict_types=1);

namespace Swag\Example\Service;

enum OrderState: string
{
    case Open = 'open';
    case Paid = 'paid';
    case Cancelled = 'cancelled';
}

final readonly class PriceResult
{
    public function __construct(
        public float $net,
        public float $gross,
        public OrderState $state,
    ) {}
}
```

- **PHP-002** **Backed enums** over class constants / string literals for any fixed value set
  in new code. You get exhaustive `match()`, autocompletion, and compile-time
  checks. Turning existing public constants of core into an enum is a break;
  deprecate them first (`sw-core-development`).
- **PHP-012** Use `readonly` and constructor property promotion for values whose
  contract is immutable. Preserve framework and extension mutability: generated
  API DTOs stay mutable (`sw-openapi-dto`), and listeners may mutate an event's
  public properties (`sw-architecture` → extension mechanisms). Keep Doctrine
  and DAL entity mutability under the surface skill's contract.

## Static-analysis-friendly typing (Shopware convention)

Shopware leans hard on PHPStan. Write code it can understand:

- **PHP-013** Prefer `list<T>` over `array<int, T>` for sequential value collections — it
  communicates the shape precisely and unlocks stricter checks.

For type narrowing (`PHP-009`), prefer:

1. Ensure the type at runtime with an explicit check (and throw).
2. Use `assert()` for development/test-time narrowing.
3. Only as a last resort, a `@var` / `@param` / `@return` PHPDoc annotation.

`@var`/`@param`/`@return` annotations are for cases language features cannot
express. They give no runtime safety — do not reach for them first.
Generic collections get `@return Collection<int, ThingEntity>`-style PHPDoc so
callers and PHPStan know the element type.

## PHP 8.x features to reach for

- **PHP-014** Check the supported PHP range in `composer.json` and any
  `config.platform.php` before adopting newer syntax. The installed runtime
  alone does not establish compatibility. Examples: `enum` and readonly
  properties (8.1), readonly classes (8.2), `#[\Override]` and typed class
  constants (8.3). Use features only when the supported minimum permits them
  and they clarify the code.

## Definition of done

- [ ] `declare(strict_types=1);` present; all params/returns/properties typed.
- [ ] Data shapes match their purpose: typed internal arrays, DTOs for meaningful boundaries, and preserved framework mutability.
- [ ] New syntax fits the supported PHP minimum; `#[\Override]` on overrides/implementations where supported; classes referenced via `use`.
- [ ] `list<T>` used for sequential collections; PHPDoc only where language types cannot express the shape.
- [ ] No `empty()`; interfaces injected where available; `ClockInterface` for time; no redundant `@var` on properties.
- [ ] Named arguments used for bare literals or skipped defaults; short self-explaining calls stay positional.
- [ ] ECS passes (PER-CS). For Shopware specifics (DAL, cache, migrations, tests) defer to the surface / testing skills.

## Further reading (optional, non-load-bearing)

- Shopware: writing code for static analysis (`shopware/shopware` `coding-guidelines/core/`).
- PHP-FIG PER Coding Style; PHPStan rule levels.

## Already enforced by CI (do not repeat)

<!-- enforced:start: generated from rules/catalog.json by `node tools/bin/render-enforced.ts`; do not edit -->
CI already fails the build on these, so do not repeat them in reviews or
checklists. Flag only what each check misses.
Checks marked *trunk only* are not active in plugin or app projects by
default; there the rule still needs a reviewer.

- `PHP-001` `strictRules.disallowedEmpty` (PHPStan, trunk only) reports every `empty()` call in core code. It misses plugins and apps, whose PHPStan config does not enable the strict rules by default; flag those.
<!-- enforced:end -->
