---
name: shopware-research-and-escalation
description: >-
  Decide when to research Shopware behavior instead of guessing, where to look,
  and what to do when stuck. Use when unsure about a Shopware/Symfony API,
  whether a class/method/service exists or behaves as assumed, which version
  applies, or when an approach keeps failing. Triggers on "I'm not sure how
  Shopware does X", "does this method exist", "which version", "verify before
  changing", "I'm stuck / it keeps failing". Do NOT use for topics you are
  confident about, or as a substitute for the profile rules (DAL, cache,
  testing) — it tells you when and how to verify, not the rules themselves.
---

# Shopware research & escalation

A small meta-skill: it does not contain Shopware rules, it governs *how the agent
behaves under uncertainty* so it verifies instead of hallucinating and escalates
instead of thrashing.

Load a reference only when relevant:

- Where to look in the docs -> [`references/docs-map.md`](references/docs-map.md)
- Library docs + source verification policy -> [`references/context7-and-libraries.md`](references/context7-and-libraries.md)
- What to do when stuck -> [`references/when-stuck.md`](references/when-stuck.md)

## When does research pay off?

Research before writing when ANY of these hold:

- The code is **behavior-sensitive or version-specific** (caching, indexing,
  pricing, rules, migrations, deprecations).
- You are about to use a **named symbol** (class, method, service id, event,
  route) and you are **< ~80% sure** it exists and behaves as you assume.
- The task spans Shopware internals you have not directly seen in this repo.

Just proceed (no research) when the pattern is trivial and well-known and you can
verify it cheaply afterwards (PHPStan/tests will catch a mistake).

## Verify against the installed source, not memory

1. **Detect the version first** from the project's `composer.json` (and
   `composer.lock` when the exact installed version matters). The version is the
   contract.
2. **Treat docs as starting evidence.** Confirm behavior-sensitive guidance and
   any named symbol against the **installed vendor code** (`vendor/shopware/...`)
   or the matching **stable release tag** — never `trunk`, beta notes, or memory.
3. Prefer reading the real method signature/implementation over assuming it.

## Routing: hand off, do not re-derive

Once you know the topic, apply the owning skill's rule (DAL ->
`shopware-plugin-development`, tests -> `shopware-testing`, etc.). This skill gets
you *to verified ground*; the profile skills tell you what to do there.

## Definition of done (for a research step)

- [ ] Project Shopware version identified.
- [ ] Any named symbol you rely on was confirmed in installed source/tagged release.
- [ ] If still uncertain after the escalation ladder, you stopped and asked the
      user with a crisp summary instead of guessing.
