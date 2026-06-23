# Core PR #17657 alignment (ai-skills-shopware owns skills)

We **mine** [shopware/shopware#17657](https://github.com/shopware/shopware/pull/17657) for
maintainer-backed deltas. We do **not** adopt core’s in-repo `.claude/skills/` — this repo
stays the single source of truth for our team (`sw-dev link-skills`).

Status key: **done** | **partial** | **skip** | **eval:TBD**

## Testing (`shopware-testing`)

| Rule (from PR) | Target | Eval |
| -------------- | ------ | ---- |
| Tests as executable examples; scenario wiring visible in test body | `references/test-shape-and-flags.md` | skip |
| Stable boilerplate in `setUp()`; shared collaborators when identity matters | same | skip |
| Unit filesystem: `Filesystem` mock vs committed `_fixtures` | same | skip |
| `expectExceptionObject` via domain factory (already covered) | `exception-assertions.md` | done |
| No DBAL `Connection` behavior-mock in unit tests | `test-shape-and-flags.md` | skip |
| Unit legacy flags: `#[DisabledFeatures]`; not `Feature::fake()` for current major | `test-shape-and-flags.md` | skip |
| Integration flags: `Feature::skipTestIfActive()` / `skipTestIfInActive()`; not `#[DisabledFeatures]` | `test-shape-and-flags.md` | skip |
| `@codeCoverageIgnore` + `@see IntegrationTest` when unit coverage N/A | `core-platform-patterns.md` | skip |
| No `#[CoversClass]` on integration tests (PHPStan) | `core-platform-patterns.md` | **done** → `integration-no-covers-class` |
| Data providers: named `yield`, not `return []`; no `yield from` inline array | `test-shape-and-flags.md` | **done** → `unit-test-yield-provider` |
| Provider names describe scenario, not raw inputs | same | skip |
| Keep distinct edge cases in providers; don’t over-deduplicate | same | skip |
| Legacy flag tests easy to delete when flag removed | same | skip |

## Core platform (`shopware-core-development`)

| Rule (from PR) | Target | Eval |
| -------------- | ------ | ---- |
| Hexagonal services: infra at edge; services unit-testable without I/O | `references/service-architecture.md` | skip |
| `@internal` adapters; `@final` on supported non-extension classes | same + `deprecations.md` | skip |
| Conservative DTOs; public readonly value objects for simple structs | `service-architecture.md` | skip |
| Public BC surface vs internal controllers/subscribers/loaders | same | skip |
| New Admin/Store API routes → OpenAPI JSON under `Schema/.../paths` | `references/api-schema.md` | skip (fixture-heavy) |
| Run `ApiRoutesHaveASchemaTest` for new/changed core API routes | `api-schema.md` | skip |
| `Feature::silent()` when core must call deprecated API for BC | `deprecations.md` | **done** → `deprecation-silent-wrapper` |
| No new code paths calling deprecated APIs; move callers to replacement | `deprecations.md` | skip |
| Inline `// @deprecated tag:` for private cleanup (not method `@deprecated`) | `deprecations.md` | skip |
| Legacy tests for deprecated APIs; removable with flag/deprecation | `deprecations.md` | skip |
| Migration class/file/`getCreationTimestamp()` = exact current Unix timestamp | `platform-architecture.md` | **done** → `migration-timestamp-format` |
| No tests for empty/no-op `updateDestructive()` | `platform-architecture.md` | skip |
| Release docs: external perspective; separate API vs Core sections | `release-notes-and-adr.md` | skip |

## PR workflow

| Rule (from PR) | Target | Eval |
| -------------- | ------ | ---- |
| Follow `.github/PULL_REQUEST_TEMPLATE.md`; no extra PR sections | `shopware-pr-description` | skip |
| Conventional PR title when requested | `pr-body-template.md` | skip |
| Review/CI fixes → new commit; no amend/force-push unless asked | `shopware-pr-description` + `shopware-pr-review` | skip |

## Review scope (`shopware-review-learnings`)

| Rule (from PR) | Target | Eval |
| -------------- | ------ | ---- |
| Root-cause fix; grep callers before shared behavior changes | `references/change-scope.md` | skip |
| Boyscout safe cleanups in touched file; mention broader cleanup, don’t expand PR | same | skip |
| Issue suggestions are hypotheses | same | skip |

## Skipped (core-only or out of scope)

| PR skill / rule | Reason |
| --------------- | ------ |
| `shopware-admin-js` | Admin JS not in our skill set yet |
| `shopware-knowledge-capture` | Overlaps our `AGENTS.md` / REGISTRY curation |
| `triage`, `sw-review` | Core gh-aw / internal review workflow |

## Batch 1 (this change) — **done**

1. Testing references + SKILL links
2. Core service architecture, API schema, deprecation deltas
3. PR hygiene lines
4. Change-scope reference

Eval tasks marked **skip** or **skip (fixture-heavy)** remain documentation-only for now.
OpenAPI route + schema eval deferred (needs route fixture tree).

## Batch 2 (eval tasks) — **done**

- `evals/tasks/unit-test-yield-provider/`
- `evals/tasks/integration-no-covers-class/`
- `evals/tasks/deprecation-silent-wrapper/`
- `evals/tasks/migration-timestamp-format/`
