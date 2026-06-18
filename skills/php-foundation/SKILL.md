---
name: php-foundation
description: >-
  Strict, modern PHP 8.x baseline for Shopware code. Use when writing or
  refactoring PHP in a Shopware project (plugin, app, or core) and deciding
  types, enums, DTOs, immutability, or coding style. Triggers on "write a PHP
  class", "refactor this service", "add types", "should this be an enum",
  "return a DTO instead of an array", PER-CS / coding-style questions, and
  PHPStan type errors. Do NOT use for non-PHP work (Twig-only, Vue/JS/SCSS),
  for PHPUnit test authoring (use shopware-testing), or for Shopware-specific
  framework topics like DAL, cache, or migrations (use the surface skills).
---

# PHP foundation (Shopware-aligned)

The shared PHP baseline every Shopware use-case inherits. It encodes only what
models get wrong *in practice* for Shopware codebases — not a generic PHP
tutorial. The surface skills (`shopware-core-development`,
`shopware-plugin-development`) add stricter deltas on top; they never contradict
this base.

## Non-negotiable baseline

- **`declare(strict_types=1);`** at the top of every PHP file, after the opening tag.
- **Full type coverage.** Every parameter, return, and property is typed. No
  untyped `array` where a shape is known — type it or model it (see below).
- **`#[\Override]`** on every method that overrides a parent or implements an
  interface (PHP 8.3+).
- **Imports, not FQCN inline.** Reference classes via `use` imports, never
  inline `\Vendor\Namespace\Class` in the body.
- **PER Coding Style** (the successor to PSR-12). Shopware enforces this via
  EasyCodingStandard (`ecs.php`); run it, do not hand-format.

## Shopware trunk habits (review-backed)

Patterns `mitelg` and `nfortier-shopware` flag repeatedly on `shopware/shopware`
PRs — apply in core, plugins, and project PHP alike:

- **No `empty()`.** Use explicit checks (`=== null`, `=== ''`, `=== []`, typed
  `count()`). In tests, prefer PHPUnit `assertEmpty()` / `assertNotEmpty()` over
  `empty()` in assertions.
- **Inject interfaces**, not concrete services or repositories, when an interface
  exists (`FooRepositoryInterface`, `ClockInterface`, …). Concrete types only
  when the implementation is intentional.
- **Time via PSR-20 clock.** Inject `Psr\Clock\ClockInterface`; do not call
  `time()`, `microtime()`, or `new \DateTimeImmutable()` in domain/services for
  “now”. Tests mock the clock — no fuzzy `time()` comparisons.
- **No `@var` on properties** when a native property type or method-level
  `@return`/`@param` generic suffices. PHPDoc is for shapes PHP cannot express,
  not a shortcut around typing.

## Use the right shape for data

Raw associative arrays are the most common Shopware-context mistake. They defeat
PHPStan, IDEs, and refactoring.

| Instead of | Use |
| ---------- | --- |
| `array $payload` with known keys | a `readonly` DTO / Value Object |
| `const STATE_OPEN = 'open'` + sibling constants | a backed `enum` |
| `['open', 'closed', 'paid']` | `enum`-typed values / `Enum::cases()` |
| returning `['success' => true, 'data' => …]` | a typed result object |

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

- **Backed enums** over class constants / string literals for any fixed value set.
  You get exhaustive `match()`, autocompletion, and compile-time checks.
- **`readonly` for DTOs / Value Objects / events** — data that should not mutate
  after construction. Use constructor property promotion.
- Do *not* slap `readonly` on Doctrine entities or DAL entity classes — that is a
  framework concern handled in the surface skills; ask before doing it.

## Static-analysis-friendly typing (Shopware convention)

Shopware leans hard on PHPStan. Write code it can understand:

- **Prefer `list<T>` over `array<int, T>`** for sequential value collections — it
  communicates the shape precisely and unlocks stricter checks.
- **Narrow types in this order** (most to least preferred):
  1. Ensure the type at runtime with an explicit check (and throw).
  2. Use `assert()` for development/test-time narrowing.
  3. Only as a last resort, a `@var` / `@param` / `@return` PHPDoc annotation.
- `@var`/`@param`/`@return` annotations are for cases language features cannot
  express. They give no runtime safety — do not reach for them first.
- Generic collections get `@return Collection<int, ThingEntity>`-style PHPDoc so
  callers and PHPStan know the element type.

## PHP 8.x features to reach for

`enum` (8.1), `readonly` properties (8.1) and classes (8.2), constructor
property promotion (8.0), `#[\Override]` (8.3), typed class constants (8.3),
first-class callable syntax, `match` over `switch`. Adopt them when they make
intent clearer — not for their own sake.

## Definition of done

- [ ] `declare(strict_types=1);` present; all params/returns/properties typed.
- [ ] No known-shape `array` that should be a DTO/VO; no constant-set that should be an enum.
- [ ] `#[\Override]` on overrides/implementations; classes referenced via `use`.
- [ ] `list<T>` used for sequential collections; PHPDoc only where language types cannot express the shape.
- [ ] No `empty()`; interfaces injected where available; `ClockInterface` for time; no redundant `@var` on properties.
- [ ] ECS passes (PER-CS). For Shopware specifics (DAL, cache, migrations, tests) defer to the surface / testing skills.

## Further reading (optional, non-load-bearing)

- Shopware: writing code for static analysis (`shopware/shopware` `coding-guidelines/core/`).
- PHP-FIG PER Coding Style; PHPStan rule levels.
