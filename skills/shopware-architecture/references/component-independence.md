# Component independence and decoupling

Load when asked to make components more independent or reduce coupling.

## Goal

Smaller, testable units with clear boundaries — **without** breaking the public
extension surface Shopware plugins rely on.

## Process

1. **Map dependencies** — grep callers, imports, and event subscribers across
   `src/` and `tests/`.
2. **Find the seam** — where does infrastructure end and domain logic begin?
3. **Extract inward** — new `@internal` service or interface in the **owning
   bundle**; keep facades stable for public callers.
4. **Prefer events over imports** — Core exposes events/interfaces; Storefront/
   Administration subscribe — never pull Storefront types into Core.
5. **Progressive enhancement** — if behaviour changes, dual path + flag (see
   progressive-enhancement reference).

## Example: “make loader more independent”

| Step | Action |
| ---- | ------ |
| 1 | Identify what the loader needs (Criteria building, hydration, rules). |
| 2 | Extract `ProductListingCriteriaFactory` as `@internal` in Core. |
| 3 | Loader delegates; public Store-API route unchanged. |
| 4 | Unit-test factory; integration-test route with flag on/off. |
| 5 | Defer indexer or unrelated refactors to another PR. |

## BC checklist for plugins

- Do plugins **decorate** this service? Changing the class id or constructor
  breaks them — prefer decoration-friendly interfaces.
- Do plugins **subscribe** to events you might remove? Deprecate event first.
- Is the class **public API** (no `@internal`)? Treat as BC-promised.

## When to stop

- Boyscout refactors that touch unrelated modules → separate PR or mention in
  review, do not expand scope.
