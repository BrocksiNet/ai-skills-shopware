---
name: shopware-review-learnings
description: >-
  Recurring, real-world findings from Shopware plugin, app, and PR reviews —
  the mistakes that keep coming back. Use when reviewing Shopware code, asking
  "is this idiomatic / will reviewers flag this", or hardening a change before
  submission. Triggers on "review this Shopware code", "what would a reviewer
  say", "is this headless/API-aware", "common Shopware mistakes". Do NOT use as
  a generic PHP linter (use php-foundation), for test rules (use
  shopware-testing), or to re-define topics already owned by the surface skills
  — this skill records findings and points at the owning skill.
---

# Shopware review learnings

A living list of the issues that *actually recur* in reviews. This is the
delta-principle skill: it only captures things the base model (and humans) keep
getting wrong, grown from real review findings — not a re-statement of the docs.

It does not re-own topics. When a finding belongs to a surface-skill topic (DAL, cache,
migrations, deprecations), the entry points at the owning skill rather than
redefining the rule. New entries come through the
[issue templates](../../.github/ISSUE_TEMPLATE) and graduate into eval tasks.

Detailed, growing lists live in references (load on demand):

- API-aware / headless findings -> [`references/api-aware.md`](references/api-aware.md)
- DAL & performance findings -> [`references/dal-and-performance.md`](references/dal-and-performance.md)

## Pre-submit (before opening or requesting review)

- **CI green** — confirm checks pass (`gh-tooling` `pr_checks` or php-tooling MCP) before
  you ask for review or mark the PR ready.
- **PR size** — aim for &lt;400 lines changed; if larger, split the PR or explain in the
  description why it must stay together (pair with `shopware-pr-description`).
- **Self-review** — scan seeded findings and red flags below against your diff.

## Seeded findings (high-frequency)

- **Custom data has no Store-API route.** Plugins add data but expose it only via
  Twig, so headless/API clients can't reach it. Provide a Store-API route for
  custom data. (See `references/api-aware.md`; owning topic: plugin development.)
- **Filtering on an association without loading it.** `addFilter` on
  `manufacturer.name` without `addAssociation('manufacturer')`. (Owning topic:
  `shopware-plugin-development` -> `references/dal-usage.md`.)
- **Deprecated `*CacheTagsEvent` in 6.7 code.** Migrate to `CacheTagCollector`.
  (Owning topic: `shopware-plugin-development` -> `references/cache-tags.md`.)
- **New Store-API / Admin API route without OpenAPI schema.** Endpoints ship with
  no schema entry — headless clients and API docs drift. Add or extend the OpenAPI
  definition for every new public route. (See `references/api-aware.md`.)
- **Business logic in controllers.** DAL calls, rules, orchestration, or branching
  live in a controller instead of an injected service. Thin controllers: validate
  input, delegate, return response. (Owning topic: `shopware-plugin-development`.)

## Red flags (Shopware-specific)

- New Store-API or Admin API endpoint with no OpenAPI schema update.
- Business logic in controllers — move orchestration and DAL work to services.
- Admin route without ACL / privilege check.
- Custom data exposed only in Twig, not via Store-API.
- Migration without a migration test.
- Deprecated `*CacheTagsEvent` in 6.7+ code.

## How to add a finding

1. Confirm it recurs (more than once, across reviews) — otherwise it is noise.
2. Confirm the base model gets it wrong (delta principle) — otherwise it is docs.
3. Put one line here (or in the right reference) with: the symptom, the fix, and
   the owning skill/topic.
4. Open or reference an `evals/tasks/<rule>/` so it becomes testable.

## TODO slots (grow these from real reviews)

- DAL: TODO - capture the recurring "writing without the right Context" finding.
- Performance: TODO - indexer / message-queue misuse findings.
- Security: TODO - unvalidated Store-API input; missing ACL on admin routes.
- Storefront: TODO - blocking/uncached AJAX in hot paths.
- Apps: TODO - app-script vs plugin boundary mistakes.
