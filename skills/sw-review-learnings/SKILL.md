---
name: sw-review-learnings
description: >-
  Review Shopware code for the findings that keep coming back in plugin, app,
  and PR reviews. Use when reviewing Shopware code, asking whether it is
  idiomatic or what a reviewer would flag, checking that it is
  headless/API-aware, looking for common Shopware mistakes, or hardening a
  change before submission. Do NOT use as a generic PHP linter (use
  sw-php-foundation), for test rules (use sw-testing), or to re-define
  topics already owned by the surface skills; this skill records findings and
  points at the owning skill.
license: MIT
metadata:
  contexts: core plugin app project
  tasks: review
  load_for: review
---

# Shopware review learnings

A living list of the issues that *actually recur* in reviews. This is the
delta-principle skill: it only captures things the base model (and humans) keep
getting wrong, grown from real review findings — not a re-statement of the docs.

It does not re-own topics. When a finding belongs to a surface-skill topic (DAL, cache,
migrations, deprecations), the entry points at the owning skill rather than
redefining the rule. New entries come through the
[issue templates](../../.github/ISSUE_TEMPLATE) and graduate into eval tasks.

> **Upstream (trunk):** If `.agents/skills/shopware-change-scope/` exists, defer
> boyscouting and root-cause scope to core. This skill keeps **delta findings**
> that recur in real reviews (API-aware, security, DAL).

Detailed, growing lists live in references. Read only the one that matches the code under review or the files it changes:

<!-- routes:start: generated from routes.json by `node tools/bin/render-routes.ts`; do not edit -->
| Read | When | Or the change touches |
| ---- | ---- | --------------------- |
| [`api-aware.md`](references/api-aware.md) | The code serves Store-API or headless clients. | `StoreApi/**/*.php`, `SalesChannel/**/*Route.php`, `store-api`, … |
| [`dal-and-performance.md`](references/dal-and-performance.md) | The code queries the DAL, runs on a hot path, or dispatches queued work. | `new Criteria(`, … |
| [`version-guards.md`](references/version-guards.md) | The change adds or keeps a class_exists or method_exists check for Shopware API. | `(class\|method\|interface)_exists((\?Shopware\b\|[A-Z][A-Za-z]+::class)` |
| [`change-scope.md`](references/change-scope.md) | A fix grows beyond the bug. | on demand |
<!-- routes:end -->

## Pre-submit (before opening or requesting review)

- **REV-001** **Scope the fix** — address root cause, not symptoms; see `references/change-scope.md`
  (or core `shopware-change-scope` on trunk).
- **REV-002** **Run quality tools before every push** — not just before PR review. Run `ecs_check`
  and `phpstan_analyze` (via MCP or `podman compose exec web`) before each `git push`.
  ECS exit-code-8 means a CS violation. PHPStan catches missing callers when you change
  an interface signature. Catching these locally is free; a CI cycle costs minutes.
- **REV-003** **Interface refactor checklist** — before changing any method signature on an
  interface, grep all usages across `src/` *and* `tests/`: `grep -rn 'methodName' src/ tests/`.
  PHPStan will catch stragglers too, but only if you run it first.
- **REV-004** **CI green** — confirm checks pass (`gh-tooling` `pr_checks` or php-tooling MCP) before
  you ask for review or mark the PR ready.
- **REV-005** **PR size** — aim for &lt;400 lines changed; if larger, split the PR or explain in the
  description why it must stay together (pair with `sw-pr-description`).
- **Self-review** — scan seeded findings and red flags below against your diff.
- **Impact of a finished feature** — shared cache, who pays, and whether the
  shop got easier are owned by `sw-change-impact`. Do not restate that
  checklist here.

## Seeded findings (high-frequency)

- **REV-006** **Custom data has no Store-API route.** Plugins add data but expose it only via
  Twig, so headless/API clients can't reach it. Provide a Store-API route for
  custom data. (See `references/api-aware.md`; owning topic: plugin development.)
- **REV-007** **Filtering on an association without loading it.** `addFilter` on
  `manufacturer.name` without `addAssociation('manufacturer')`. (Owning topic:
  `sw-plugin-development` -> `references/dal-usage.md`.)
- **REV-008** **Deprecated `*CacheTagsEvent` in 6.7 code.** Migrate to `CacheTagCollector`.
  (Owning topic: `sw-plugin-development` -> `references/cache-tags.md`.)
- **REV-009** **New Store-API / Admin API route without OpenAPI schema.** Endpoints ship with
  no schema entry — headless clients and API docs drift. Add or extend the OpenAPI
  definition for every new public route. (See `references/api-aware.md`.)
- **REV-010** **Business logic in controllers.** DAL calls, rules, orchestration, or branching
  live in a controller instead of an injected service. Thin controllers: validate
  input, delegate, return response. (Owning topic: `sw-plugin-development`.)
- **REV-011** **Admin route ACL uses constant-form privilege keys** — match existing
  `Administration::…` / route `_acl` conventions; PHPStan rules flag wrong shapes.
  (Core: `sw-core-development` -> `platform-architecture.md`.)
- **REV-012** **`updateDestructive()` misused.** Long-running backfills or heavy work do not
  belong in destructive migrations; never edit shipped migrations — add a new class.
  (Owning topic: `sw-plugin-development` -> `references/migrations.md`; core:
  `platform-architecture.md`.)
- **REV-013** **Cross-test docblock uses FQCN instead of `@see`.** Point at the covering test with
  `@see ImportedTestClass` and a `use` statement — not `\Shopware\Tests\…\OtherTest`
  in prose. (Owning topic: `sw-testing` -> `core-platform-patterns.md`.)
- **REV-014** **`#[CoversNothing]` safeguard test in `tests/unit/`.** Config/wiring checks that do
  not cover production code belong in `tests/devops/` on core — keep the unit suite
  for Codecov. (Owning topic: `sw-testing` -> `core-platform-patterns.md`.)

- **`class_exists` guard for a core framework class** (`REV-015`): dead code when the
  oldest release in the `shopware/core` range already ships the class. Only guard API
  added *within* the range. (See `references/version-guards.md`; owning topic:
  `sw-plugin-development` -> `references/version-compatibility.md`.)
- **REV-016** **Direct `$_SERVER`/`getenv` access for Shopware feature flags** — use
  `Feature::has('FLAG') && Feature::isActive('FLAG')` (or `!Feature::has() || Feature::isActive()`
  for "assume active when flag is gone"). `Feature::has()` guards against
  `E_USER_WARNING` on unregistered flags; going below the platform API produces
  fragile code reviewers will flag. (Owning topic: `sw-plugin-development`
  -> `references/version-compatibility.md`.)
- **REV-017** **FQCN inline instead of `use` import** — `\Shopware\Core\Framework\Feature::isActive()`
  in a method body is a PER-CS/ECS violation. Always add the `use` statement.
  (`sw-php-foundation` baseline rule; ECS catches it automatically.)

## Red flags (Shopware-specific)

- New Store-API or Admin API endpoint with no OpenAPI schema update.
- Business logic in controllers — move orchestration and DAL work to services.
- Admin route without ACL / privilege check or wrong ACL constant form.
- Custom data exposed only in Twig, not via Store-API.
- Migration without a migration test; destructive step used for heavy work.
- Deprecated `*CacheTagsEvent` in 6.7+ code.

## How to add a finding

1. Confirm it recurs (more than once, across reviews) — otherwise it is noise.
2. Confirm the base model gets it wrong (delta principle) — otherwise it is docs.
3. Put one line here (or in the right reference) with: the symptom, the fix, and
   the owning skill/topic.
4. Open or reference an `evals/tasks/<rule>/` so it becomes testable.

## TODO slots (grow these from real reviews)

- DAL: TODO - capture the recurring "writing without the right Context" finding.
- Performance: TODO - indexer misuse findings (queue fallback is `REV-033`).
- Security: hardcoded access keys, missing Store-API ACL — see `sw-security`.
- Storefront: blocking/uncached AJAX on listing/product/home — own in
  `sw-storefront` (`references/cache-and-modern-web.md`).
- Apps: TODO - app-script vs plugin boundary mistakes.

## Already enforced by CI (do not repeat)

<!-- enforced:start: generated from rules/catalog.json by `node tools/bin/render-enforced.ts`; do not edit -->
CI already fails the build on these, so do not repeat them in reviews or
checklists. Flag only what each check misses.
Checks marked *trunk only* are not active in plugin or app projects by
default; there the rule still needs a reviewer.

- `REV-017` `fully_qualified_strict_types` (PHP-CS-Fixer, trunk only) rewrites namespaced FQCNs in code and in `@param`, `@return`, `@var` and `@throws` tags to `use` imports. It misses `@see` tags, global classes such as `\Exception`, and class names inside strings; flag those.
<!-- enforced:end -->
