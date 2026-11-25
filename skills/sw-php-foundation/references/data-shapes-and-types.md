# Data shapes, static-analysis typing, and PHP 8.x ranges

Load when designing a DTO or value object, deciding mutability (`readonly`),
narrowing types for PHPStan (`list<T>`, `@var`), or checking supported PHP 8.x
syntax against `composer.json`.

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

- **PHP-012** Use `readonly` and constructor property promotion for values whose
  contract is immutable. Preserve framework and extension mutability: generated
  API DTOs stay mutable (`sw-openapi-dto`), and listeners may mutate an event's
  public properties (`sw-architecture` → extension mechanisms). Keep Doctrine
  and DAL entity mutability under the surface skill's contract.

## Static-analysis-friendly typing (Shopware convention)

Shopware leans hard on PHPStan. Write code it can understand:

- **PHP-009** No `@var` on properties when a native property type or method-level
  `@return`/`@param` generic suffices. PHPDoc is for shapes PHP cannot express,
  not a shortcut around typing.
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
