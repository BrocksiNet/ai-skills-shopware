# Review lenses

Ask these of every plugin or app diff, whether a borrowed reference is
selected or not. Each question points at the rule that owns the answer; the
rule's own text decides, not this list.

## Backward compatibility for extenders

A released extension is an API for the shops and the other extensions that
build on it. For each removed or renamed name, ask who used it:

- A route field changed type or nullability, or a route got stricter:
  `PLG-027`, `PLG-031`.
- A route's access or cache default changed: `SEC-007`.
- A Twig block, template variable, SCSS variable, state class or snippet key
  was renamed or removed: `SF-001`, `SF-012`.
- A JS plugin's name, option, method or event changed: `SF-011`.
- An admin component prop, block or `positionIdentifier` changed: `ADM-039`,
  `ADM-040`.
- An extension event gained the whole `Request`: `ARCH-005`.

A rename without a deprecation and a fallback is a removal. A deprecation
points at a replacement the extenders can use today: `CORE-063`.

## Cache

- Does a cached result still vary only by what its cache key holds:
  `IMP-008`?
- Does the change switch the HTTP cache off for a group of customers instead
  of changing the policy: `SF-013`?
- Are cache tags invalidated through the 6.7 tag model, not deprecated
  events (see the plugin `cache-tags.md` reference)?

## Data and migrations

- Does a migration overwrite merchant edits, narrow a column in `update()`,
  or backfill a large table in one statement: `PLG-028`, `PLG-030`,
  `PLG-019`?
- Is a migration behind a feature flag: `PLG-029`?
- Does a hot path load associations per row: `REV-021`?

## Workers and long-running processes

- Does a service memoize in a property without resetting it between
  messages: `ARCH-001`?
- Does queued work fall back to running inline when the queue is down:
  `REV-033`?

## Security

- Is new route input validated and typed: `SEC-005`?
- Does an app verify webhook signatures: `SEC-006`?
- Are secrets read from configuration, not committed (see the security
  `secrets-and-config.md` reference)?

## Tests

- Can the new test fail? An assertion inside a hook or listener that never
  runs proves nothing: `TEST-016`, `TEST-035`.
- Does the test cover the case the diff changes, not only the happy path?

## Core-only rules

These rules sit in borrowed references but are for `shopware/shopware`
itself. Do not report them on a plugin or app diff:

- `ADM-013` and `ADM-015`: the Administration boot order and the global
  `Shopware` object's extension points.
- `ARCH-004`: new core Store API routes publish a typed extension event.
- `TEST-024` and `TEST-031`: tests for major feature flag behavior.
