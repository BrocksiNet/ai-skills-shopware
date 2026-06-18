# Platform architecture (core)

Load this when wiring services, events, HTTP, or cross-bundle code in
`shopware/shopware`. Seeded from recurring `mitelg` / `nfortier-shopware` review
patterns (2025–2026).

## Bundle ownership

- Register services in the **bundle that owns the domain** (`Core`, `Storefront`,
  `Administration`, …). Do not register Core services from Storefront config (or
  vice versa).
- Shared abstractions live in Core; bundle-specific wiring stays in that bundle.

## Core ↔ Storefront / Administration boundaries

- **Core must not depend on Storefront or Administration.** Decouple with events,
  interfaces defined in Core, or extension points — not direct class references
  across bundles.
- When Storefront needs Core behaviour, subscribe in Storefront or expose an
  event from Core; do not pull Storefront types into Core.

## Events: listener vs subscriber

- **One event → prefer `#[AsEventListener]`** (or equivalent tag) over
  `EventSubscriberInterface` + `getSubscribedEvents()` — less boilerplate for a
  single handler.
- **`getSubscribedEvents()` return type** must be explicit (`array` with documented
  shape) when you do use a subscriber.

## Sealing classes

- New classes **not meant for extension**: prefer `final` over relying on `@internal`
  alone. `@internal` documents intent; `final` enforces it.
- Do not call or extend `@internal` symbols from outside their bundle.

## HTTP / session

- **Thin controllers** — validate input, delegate to a service, return a response.
  No DAL orchestration or business rules in controllers when a service suffices.
- **Avoid lazy sessions** on read paths. Use safe session checks (`hasSession()`,
  request attributes) instead of touching the session when not required.

## Migrations (platform)

- **`updateDestructive()` is not for long-running work** — keep heavy backfills in
  `update()` or dedicated commands; destructive step stays small.
- **Never edit a shipped migration** — add a new class with a new timestamp.
- Data migrations that affect indexers may need **refresh-index** follow-up; check
  existing migration tests and Danger rules for DAL entities you touch.

Owning topics elsewhere: deprecations (`deprecations.md`), release docs
(`release-notes-and-adr.md`), PHPUnit placement (`shopware-testing`).
