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

Decide the surface first, then pick one marker. From its first release an
unmarked class is public API, and every later change to its shape needs a full
deprecation cycle.

- **Not for third parties** (controllers, subscribers, loaders, adapters, DTOs with
  one internal caller): `@internal`. Do not add `@final` on top.
- **New public API whose shape may still change**: `@experimental stableVersion:v6.X.0`.
- **Supported public class, not meant for extension**: `@final`, so tests and
  framework mechanics can still subclass or mock it.
- **Simple value objects and structs** nobody needs to decorate or mock: a real
  `final class`.
- Do not call or extend `@internal` symbols from outside their bundle.

Details: [`service-architecture.md`](service-architecture.md#classes-final-and-internal).

## HTTP / session

- **Thin controllers** — validate input, delegate to a service, return a response.
  No DAL orchestration or business rules in controllers when a service suffices.
- **Avoid lazy sessions** on read paths. Use safe session checks (`hasSession()`,
  request attributes) instead of touching the session when not required.

## Migrations (platform)

- Use the **exact current Unix timestamp** for new migration class names, file
  names, and `getCreationTimestamp()` — not placeholder or rounded values.
- **`updateDestructive()` is not for long-running work** — keep heavy backfills in
  `update()` or dedicated commands; destructive step stays small.
- **Never edit a shipped migration** — add a new class with a new timestamp.
- Do **not** add tests for empty/no-op `updateDestructive()` implementations;
  cover meaningful behavior in `update()` or destructive migrations that change state.
- Data migrations that affect indexers may need **refresh-index** follow-up; check
  existing migration tests and Danger rules for DAL entities you touch.

Owning topics elsewhere: deprecations (`deprecations.md`), release docs
(`release-notes-and-adr.md`), PHPUnit placement (`shopware-testing`).
