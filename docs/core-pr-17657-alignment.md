# Core skill alignment (ai-skills-shopware owns skills)

We **mine** `shopware/shopware` trunk `.agents/skills/` for maintainer-backed
deltas. We do **not** copy core’s in-repo skills — this repo stays the single
source of truth for plugins, older core branches, and eval-backed rules
(`sw-dev link`, install profiles in [`skill-resolution.md`](skill-resolution.md)).

Seed PR: [#17657](https://github.com/shopware/shopware/pull/17657) (merged
2026-06-26). **Last mined:** trunk 2026-09-01. Canonical path:
`.agents/skills/`; `.claude/skills` → symlink.

Catalog since #17657 is unchanged (no new skill names, still no storefront
skill). Content drift is in `shopware-php-code`, `shopware-phpunit-tests`, and
`shopware-release-docs`.

Status key: **done** | **partial** | **skip** | **eval:TBD** | **defer-on-trunk**

## Core skill mapping

| Core skill | Our owner | On trunk |
| ---------- | --------- | -------- |
| `shopware-php-code` | `shopware-core-development` + `shopware-architecture` | **defer** static rules to core |
| `shopware-phpunit-tests` | `shopware-testing` | **defer** |
| `shopware-pr-hygiene` | `shopware-pr-description` | **defer** |
| `shopware-change-scope` | `shopware-review-learnings` → change-scope | **defer** |
| `shopware-release-docs` | `shopware-core-development` → release-notes | **defer** |
| `shopware-admin-js` | `shopware-admin-js` | **done** (mined; defer short list on trunk) |
| `shopware-knowledge-capture` | `AGENTS.md` / REGISTRY | skip |
| `nightly-triage` | — | skip (gh-aw CI sweeps) |
| `sw-triage`, `sw-review`, `sw-bugfixer` | — | skip (gh-aw; explicit invocation only) |

## Testing (`shopware-testing`)

| Rule (from PR) | Target | Eval |
| -------------- | ------ | ---- |
| Tests as executable examples; scenario wiring visible in test body | `references/test-shape-and-flags.md` | defer-on-trunk |
| Stable boilerplate in `setUp()`; shared collaborators when identity matters | same | defer-on-trunk |
| Unit filesystem: `Filesystem` mock vs committed `_fixtures`; write disk via `Filesystem` | same | **done** (documented) |
| Never `exit()` / `die()` in tests; `setAutoExit(false)` | same | defer-on-trunk (documented) |
| No `ReflectionMethod::invoke` on Shopware privates | same | **done** → `no-reflection-on-shopware-method` |
| One `#[CoversClass]` per unit/migration file | `core-platform-patterns.md` | **done** → `one-covers-class-per-file` |
| Test `#[Package]` must match owning class (`TestPackageMatchRule`) | same | **done** (documented; existence eval already) |
| Every test class `@internal` | same | **done** → `test-class-marked-internal` |
| `StaticEntityRepository` generic inference / `::of()` | `test-shape-and-flags.md` | defer-on-trunk (documented) |
| Named arguments on helper/builder literals | same + `php-foundation` | **done** (documented) |
| `@codeCoverageIgnore` pass-through only (`CodeCoverageIgnoreEvaluationRule`) | `core-platform-patterns.md` | defer-on-trunk (documented) |
| `expectExceptionObject` via domain factory (already covered) | `exception-assertions.md` | done |
| No DBAL `Connection` behavior-mock in unit tests | `test-shape-and-flags.md` | defer-on-trunk |
| Unit legacy flags: `#[DisabledFeatures]`; not `Feature::fake()` for current major | `test-shape-and-flags.md` | defer-on-trunk |
| Integration flags: `Feature::skipTestIfActive()` / `skipTestIfInActive()`; not `#[DisabledFeatures]` | `test-shape-and-flags.md` | **done** (runtime-enforced #18350) |
| `@codeCoverageIgnore` on production class uses FQCN `@see` on trunk | `core-platform-patterns.md` | defer-on-trunk |
| No `#[CoversClass]` on integration tests (PHPStan) | `core-platform-patterns.md` | **done** → `integration-no-covers-class` |
| Cross-test docblock uses `@see` + import, not FQCN prose | `core-platform-patterns.md` | **done** → `test-docblock-use-see` |
| `#[Package('…')]` on every test class | `core-platform-patterns.md` | **done** → `test-class-has-package-attribute` |
| `#[CoversNothing]` safeguard tests in `tests/devops/`, not `tests/unit/` | `core-platform-patterns.md` | **done** → `safeguard-test-not-in-unit-suite` |
| Data providers: named `yield`, not `return []`; no `yield from` inline array | `test-shape-and-flags.md` | **done** → `unit-test-yield-provider` |
| Provider names describe scenario, not raw inputs | same | defer-on-trunk |
| Keep distinct edge cases in providers; don’t over-deduplicate | same | defer-on-trunk |
| Legacy flag tests easy to delete when flag removed | same | defer-on-trunk |

## Core platform (`shopware-core-development` + `shopware-architecture`)

| Rule (from PR) | Target | Eval |
| -------------- | ------ | ---- |
| Hexagonal services: infra at edge; services unit-testable without I/O | `shopware-architecture` + `service-architecture.md` | defer-on-trunk / **done** → `business-logic-in-controller` |
| `@internal` adapters; `@final` on supported non-extension classes | same + `deprecations.md` | defer-on-trunk |
| Conservative DTOs; public readonly value objects for simple structs | `service-architecture.md` | defer-on-trunk |
| Public BC surface vs internal controllers/subscribers/loaders | same | defer-on-trunk |
| Bounded DAL reads (setLimit) | `shopware-architecture` → `dal-contracts.md` | **done** → `dal-search-without-limit` |
| Repository not Connection for entity reads | `dal-contracts.md` | **done** → `no-dal-connection-for-entity-read` |
| New Admin/Store API routes → OpenAPI JSON under `Schema/.../paths` | `api-schema.md` (core) | skip (fixture-heavy) |
| Plugin/extension OpenAPI for custom routes | `shopware-plugin-development` → `api-contracts.md` | **done** → `store-api-openapi-required` |
| Run `ApiRoutesHaveASchemaTest` for new/changed core API routes | `api-schema.md` | skip |
| `Feature::silent()` when core must call deprecated API for BC | `deprecations.md` | **done** → `deprecation-silent-wrapper` |
| Plan major breaks with `BCChange` attributes, not `@deprecated reason:*` | `deprecations.md` | **done** → `bc-change-not-deprecated-reason` |
| Do not `<deprecated>` a DI service id core still references | `deprecations.md` | **done** (documented) |
| Symfony `Filesystem` instead of raw PHP file functions | `service-architecture.md` | **done** → `symfony-filesystem-over-raw-php` |
| Progressive enhancement / dual path behind flag | `shopware-architecture` → `progressive-enhancement.md` | **done** → `core-http-client-behind-flag` |
| No new code paths calling deprecated APIs; move callers to replacement | `deprecations.md` | defer-on-trunk |
| Inline `// @deprecated tag:` for private cleanup (not method `@deprecated`) | `deprecations.md` | defer-on-trunk |
| Legacy tests for deprecated APIs; removable with flag/deprecation | `deprecations.md` | defer-on-trunk |
| Migration class/file/`getCreationTimestamp()` = exact current Unix timestamp | `platform-architecture.md` | **done** → `migration-timestamp-format` |
| No tests for empty/no-op `updateDestructive()` | `platform-architecture.md` | defer-on-trunk |
| Release docs: external perspective; separate API vs Core sections | `release-notes-and-adr.md` | **done** (documented) |
| `UPGRADE` = must third-party code change?; past tense; no repeated headings | `release-notes-and-adr.md` | **done** (documented) |

## Security (`shopware-security`) — ours only

| Rule | Target | Eval |
| ---- | ------ | ---- |
| No hardcoded sales channel access keys in source | `secrets-and-config.md` | **done** → `no-access-key-in-source` |
| Store-API / Admin routes declare ACL | `api-acl-and-input.md` | **done** → `store-api-route-missing-acl` |
| App manifest least privilege | `apps-and-webhooks.md` | **done** → `app-manifest-least-privilege` |

## PR workflow

| Rule (from PR) | Target | Eval |
| -------------- | ------ | ---- |
| Follow `.github/PULL_REQUEST_TEMPLATE.md`; no extra PR sections | `shopware-pr-description` | defer-on-trunk |
| Conventional PR title when requested | `pr-body-template.md` | defer-on-trunk |
| Review/CI fixes → new commit; no amend/force-push unless asked | `shopware-pr-description` + `shopware-pr-review` | defer-on-trunk |
| No AI-agent attribution trailers (`Co-authored-by`, …) | `shopware-pr-description` | **done** (documented) |

## Review scope (`shopware-review-learnings`)

| Rule (from PR) | Target | Eval |
| -------------- | ------ | ---- |
| Root-cause fix; grep callers before shared behavior changes | `references/change-scope.md` | defer-on-trunk |
| Boyscout safe cleanups in touched file; mention broader cleanup, don’t expand PR | same | defer-on-trunk |
| Issue suggestions are hypotheses | same | defer-on-trunk |

## Skipped (core-only or out of scope)

| PR skill / rule | Reason |
| --------------- | ------ |
| `shopware-admin-js` | mined into our `shopware-admin-js`; defer short list on trunk |
| `shopware-knowledge-capture` | Overlaps our `AGENTS.md` / REGISTRY curation |
| `triage`, `sw-review` | Core gh-aw / internal review workflow |
