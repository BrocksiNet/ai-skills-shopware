---
name: sw-research-and-escalation
description: >-
  Research Shopware behavior instead of guessing, know where to look, and
  escalate when stuck. Use when unsure how Shopware or Symfony does something,
  whether a class, method, or service exists or behaves as assumed, which
  version applies, when a change should be verified first, or when an approach
  keeps failing. Do NOT use for topics you are confident about, or as a
  substitute for the surface-skill rules (DAL, cache, testing): it tells you
  when and how to verify, not the rules themselves.
license: MIT
metadata:
  contexts: core plugin app project
  tasks: build review answer
  load_for: answer
---

# Shopware research & escalation

A small meta-skill: it does not contain Shopware rules, it governs *how the agent
behaves under uncertainty* so it verifies instead of hallucinating and escalates
instead of thrashing.

Read only the reference that matches the task or the files it changes:

<!-- routes:start: generated from routes.json by `node tools/bin/render-routes.ts`; do not edit -->
| Read | When | Or the change touches |
| ---- | ---- | --------------------- |
| [`docs-map.md`](references/docs-map.md) | You need to know where Shopware documents a topic. | on demand |
| [`context7-and-libraries.md`](references/context7-and-libraries.md) | You check library docs or verify against source. | `composer.json`, `composer.lock`, … |
| [`modern-web-guidance.md`](references/modern-web-guidance.md) | The question is about a generic CSS, HTML or JS API. | `speculationrules`, … |
| [`when-stuck.md`](references/when-stuck.md) | An approach keeps failing. | on demand |
<!-- routes:end -->

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
`sw-plugin-development`, tests -> `sw-testing`, etc.). This skill gets
you *to verified ground*; the surface skills tell you what to do there.

## Definition of done (for a research step)

- [ ] Project Shopware version identified.
- [ ] Any named symbol you rely on was confirmed in installed source/tagged release.
- [ ] If still uncertain after the escalation ladder, you stopped and asked the
      user with a crisp summary instead of guessing.
