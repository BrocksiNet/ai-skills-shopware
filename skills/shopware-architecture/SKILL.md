---
name: shopware-architecture
description: >-
  Shopware and Symfony architecture decisions — patterns, anti-patterns, and
  BC-safe progressive enhancement. Use when refactoring, decoupling components,
  choosing extension mechanisms, or modernizing without breaking extensions.
  Triggers on "decouple this component", "make it more independent",
  "progressive enhancement", "architectural refactor", "repository without limit",
  "DAL internals", "choose event vs decoration", "dual path behind feature flag".
  Do NOT use for PHPUnit tests (shopware-testing), secrets/ACL (shopware-security),
  OpenAPI route docs (shopware-plugin-development api-contracts), or static PHP
  style (php-foundation). On shopware/shopware trunk, defer static hexagonal rules
  to in-repo shopware-php-code when present.
---

# Shopware architecture (patterns + evolution)

Decision guide for **how** to structure Shopware PHP — not lint-level style.
Use when a task is about refactors, boundaries, DAL usage, Symfony placement,
or rolling out new behaviour without breaking plugins.

> **Upstream (trunk):** If `.agents/skills/shopware-php-code/` exists in the
> workspace, prefer it for hexagonal layout, `@internal`, DTO conservatism, and
> migration timestamps. This skill adds **decision trees**, **anti-patterns**,
> and **progressive enhancement** playbooks.

Load references on demand:

- BC-safe rollout → [`references/progressive-enhancement.md`](references/progressive-enhancement.md)
- Decoupling / independence → [`references/component-independence.md`](references/component-independence.md)
- DAL public contract vs internals → [`references/dal-contracts.md`](references/dal-contracts.md)
- Symfony inside Shopware → [`references/symfony-in-shopware.md`](references/symfony-in-shopware.md)
- Event vs decorate vs extend → [`references/extension-mechanisms.md`](references/extension-mechanisms.md)
- Recurring mistakes → [`references/anti-patterns.md`](references/anti-patterns.md)
- Established + candidate patterns → [`references/pattern-catalog.md`](references/pattern-catalog.md)

## Decision flow (start here)

1. **Surface** — core platform (`shopware-core-development`), plugin/project
   (`shopware-plugin-development`), or app (`shopware-app-development`)?
2. **Public API touched?** — If yes, deprecation cycle + release docs; if no,
   prefer internal swap behind a narrow interface.
3. **Extension mechanism** — event vs decoration vs entity extension vs new route
   (see reference).
4. **Progressive enhancement** — new path behind `Feature::isActive()`; keep
   legacy path until major; test both (see reference).
5. **Scope** — smallest root-cause change; grep callers before shared behaviour
   edits (`shopware-review-learnings` → change-scope when present).

## Hard guardrails

1. **Never unbounded DAL reads** on large entities — always `setLimit` / pagination
   unless a documented admin/export exception.
2. **Never use Doctrine `Connection` for entity CRUD** when `EntityRepository` +
   `Criteria` express the query.
3. **Never import Storefront/Administration from Core** (or core/vendor from plugins).
4. **Never silent behaviour change** on paths extensions observe — flag, release
   note, or explicit BC branch.

## Definition of done

- [ ] Correct extension mechanism chosen; dependencies flow inward (Core ← bundles).
- [ ] DAL reads bounded; repositories used for entity data.
- [ ] Refactors that change behaviour use progressive enhancement (flag + legacy path) on core.
- [ ] Large decoupling split into phased PRs when needed; ADR for architectural forks.

## Further reading

- Core trunk skills: `.agents/skills/shopware-php-code`, `shopware-change-scope`
- Install profiles: [`docs/skill-resolution.md`](../../docs/skill-resolution.md)
