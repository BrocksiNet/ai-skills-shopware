---
name: sw-php-foundation
description: >-
  Strict modern PHP 8.x baseline for Shopware code. Load before writing or
  refactoring any PHP class in a plugin, app, or core: constructor DI types,
  backed enums vs constants, explicit checks over empty(), ClockInterface over
  time()/date(), DTOs, PER-CS, or PHPStan errors. Do NOT use for non-PHP,
  PHPUnit tests (sw-testing), or Shopware DAL/cache/migrations (surface
  skills).
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

Read the reference when the task needs data-shape or typing details:

<!-- routes:start: generated from routes.json by `node tools/bin/render-routes.ts`; do not edit -->
| Read | When | Or the change touches |
| ---- | ---- | --------------------- |
| [`data-shapes-and-types.md`](references/data-shapes-and-types.md) | You model a DTO or value object, choose readonly mutability, narrow PHPStan types (list<T>, @var), or check PHP 8.x minimum version syntax. | on demand |
<!-- routes:end -->

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
- **PHP-010** Name the arguments when a call passes several values that do not describe
  themselves — `true`, `false`, `0`, `1`, `[]`, `null` — or when naming lets you
  skip defaults you only passed in order to reach a later argument. Leave a
  short, self-explaining call positional.
- **PHP-002** **Backed enums** over class constants / string literals for any fixed value set
  in new code. You get exhaustive `match()`, autocompletion, and compile-time
  checks. Turning existing public constants of core into an enum is a break;
  deprecate them first (`sw-core-development`).
- **Data shapes, typing, and PHP 8.x ranges:** no redundant `@var` (`PHP-009`),
  DTOs for real boundaries (`PHP-011`), `readonly` where immutable (`PHP-012`),
  `list<T>` over `array<int, T>` (`PHP-013`), and verify PHP 8.x syntax against
  `composer.json` (`PHP-014`). See [`data-shapes-and-types.md`](references/data-shapes-and-types.md).

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
