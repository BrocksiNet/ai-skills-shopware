---
name: shopware-review-learnings
description: >-
  Recurring, real-world findings from Shopware plugin, app, and PR reviews —
  the mistakes that keep coming back. Use when reviewing Shopware code, asking
  "is this idiomatic / will reviewers flag this", or hardening a change before
  submission. Triggers on "review this Shopware code", "what would a reviewer
  say", "is this headless/API-aware", "common Shopware mistakes". Do NOT use as
  a generic PHP linter (use php-foundation), for test rules (use
  shopware-testing), or to re-define topics already owned by the profile skills
  — this skill records findings and points at the owning skill.
---

# Shopware review learnings

A living list of the issues that *actually recur* in reviews. This is the
delta-principle skill: it only captures things the base model (and humans) keep
getting wrong, grown from real review findings — not a re-statement of the docs.

It does not re-own topics. When a finding belongs to a profile topic (DAL, cache,
migrations, deprecations), the entry points at the owning skill rather than
redefining the rule. New entries come through the
[issue templates](../../.github/ISSUE_TEMPLATE) and graduate into eval tasks.

Detailed, growing lists live in references (load on demand):

- API-aware / headless findings -> [`references/api-aware.md`](references/api-aware.md)
- DAL & performance findings -> [`references/dal-and-performance.md`](references/dal-and-performance.md)

## Seeded findings (high-frequency)

- **Custom data has no Store-API route.** Plugins add data but expose it only via
  Twig, so headless/API clients can't reach it. Provide a Store-API route for
  custom data. (See `references/api-aware.md`; owning topic: plugin development.)
- **Filtering on an association without loading it.** `addFilter` on
  `manufacturer.name` without `addAssociation('manufacturer')`. (Owning topic:
  `shopware-plugin-development` -> `references/dal-usage.md`.)
- **Deprecated `*CacheTagsEvent` in 6.7 code.** Migrate to `CacheTagCollector`.
  (Owning topic: `shopware-plugin-development` -> `references/cache-tags.md`.)

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
