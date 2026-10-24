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
- An admin component prop or block changed: `ADM-039`.
- An extension event gained the whole `Request`: `ARCH-005`.

A rename without a deprecation and a fallback is a removal. A deprecation
points at a replacement the extenders can use today: `CORE-063`.

## Supported versions

- Does the diff call a Shopware class or method that the oldest release in
  the `shopware/core` range lacks, such as the replacement for a deprecated
  method, without a guard or an announced range bump: `PLG-001`?
- Does a new `class_exists` or `method_exists` guard name API that every
  release in the range already ships: `REV-015`? Does it check the class
  when only the method is new: `PLG-024`?
- When `api-facts` output comes with the task, or the ai-skills-shopware
  tools are at hand (`node tools/api-index/bin/api-facts.ts --apply
  diff.patch <extension>`), use its facts for the two questions above. It
  also covers the admin components and blocks, storefront templates and
  blocks, JS plugins and Twig functions the change overrides or calls; one
  missing from a release of the range is `PLG-001` too. They are facts about
  Shopware's source per release, not findings: check each against the diff
  before you report it.
- Does code that loads on every request use a package that `composer.json`
  only suggests, outside its guard: `PLG-032`?
- Does an admin override replace a core method without `$super`:
  `ADM-042`?
- Does a bundle for 6.5 and 6.6+ bind `sw-*` fields with `@change` or a
  bare `@update:value`: `ADM-044`?

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
- Does the plugin write its entities with raw SQL, so DAL events, indexers
  and cache invalidation never run: `PLG-003`, `REV-024`, `PLG-007`?
- Does a hot path load associations per row: `REV-021`?

## Workers and long-running processes

- Does a service memoize in a property without resetting it between
  messages: `ARCH-001`?
- Does queued work fall back to running inline when the queue is down:
  `REV-033`?

## Security

- Is new route input validated and typed: `SEC-005`?
- Does new admin UI that reads a DAL entity or association ship the ACL
  privileges for it: `ADM-004`? Does a plugin role grant `system_config`
  privileges: `ADM-043`?
- Does a stored idempotent response replay only to its own caller:
  `SEC-008`?
- Does an app verify webhook signatures: `SEC-006`?
- Are secrets read from configuration, not committed (see the security
  `secrets-and-config.md` reference)?

## Tests

- Can the new test fail? An assertion inside a hook or listener that never
  runs proves nothing: `TEST-016`, `TEST-035`.
- Did the diff change an existing test's expectation along with the code,
  without announcing the behavior change: `TEST-036`?
- Does the test cover the case the diff changes, not only the happy path?

## Near misses

Real reviews cited these rules for problems they do not cover. Report the
problem with `null`, or with the rule that does cover it:

| Problem | Not | Use |
| ------- | --- | --- |
| A database query on every response or request, cache hits included | `SF-013` (cache switched off) | `null` |
| A write that skips cache invalidation | `IMP-008` (cache key inputs) | `PLG-007`, or `PLG-003` / `REV-024` for raw SQL |
| An HTTP call made synchronously in the request, with no queue anywhere | `REV-033` (inline fallback when queueing fails) | `null` |
| An idempotency key or stored response not scoped to the caller | `SEC-005` (input validation) | `SEC-008` |
| An admin override of a core component that skips `$super` | `ADM-039` (the API a shipped component offers) | `ADM-042` |
| An override of a core admin block, storefront template or block, or JS plugin that a release in the `shopware/core` range lacks | `ADM-039`, `SF-001`, `SF-011` (the API the extension itself offers) | `PLG-001` |

## Core-only rules

These rules sit in borrowed references but are for `shopware/shopware`
itself. Do not report them on a plugin or app diff:

- `ARCH-004`: new core Store API routes publish a typed extension event.
- `TEST-031`: tests for major feature flag behavior.
- `CORE-064` and `CORE-065`: shims for core removals and gating code that
  ends at the major.
