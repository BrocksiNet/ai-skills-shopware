# Core skill alignment (ai-skills-shopware owns skills)

We **mine** `shopware/shopware` trunk `.agents/skills/` for maintainer-backed
deltas. We do **not** copy core’s in-repo skills — this repo stays the single
source of truth for plugins, older core branches, and eval-backed rules
(`sw-dev link`, install profiles in [`skill-resolution.md`](skill-resolution.md)).

Seed PR: [#17657](https://github.com/shopware/shopware/pull/17657) (merged
2026-06-26). **Last mined:** trunk 2026-10-19 (see
[Mining pass 2026-10-19](#mining-pass-2026-10-19); before that
[2026-10-13](#mining-pass-2026-10-13) and 2026-09-28 via
[#20879](https://github.com/shopware/shopware/pull/20879),
[#20652](https://github.com/shopware/shopware/pull/20652),
[#20575](https://github.com/shopware/shopware/pull/20575)).
Canonical path: `.agents/skills/`; `.claude/skills` → symlink.

From 2026-10-20 the weekly
[`mine-trunk`](../.github/workflows/mine-trunk.yml) workflow lists new deltas
in an issue labeled `trunk-drift`, and [`.mining-state.json`](.mining-state.json)
records how far trunk has been read. Record each decision from such an issue
in a mining pass section here, as before.

The guidance-skill catalog since #17657 is unchanged: no new `shopware-*`
names, still no storefront skill (a `shopware-storefront-component` skill is
WIP in [#20437](https://github.com/shopware/shopware/pull/20437)). The CI-only
skills were renamed to `sw-*` and gained `nightly-triage`. Later drift: new Store API routes use extension events
(`shopware-php-code`, #20879); integration tests take only the traits they
need (#20575); a test that asserts a throw while a major flag is active is
`@deprecated` on that method (#20652).

Status key: **done** | **partial** | **skip** | **eval:TBD** | **defer-on-trunk**

## Watchlist

Open core PRs that will change our skills (plan WP9). Checked 2026-10-20 with
`gh pr view <n> -R shopware/shopware --json state,mergedAt`; WP8 will update
this table weekly. When a PR merges, do its "Our impact" work and move the
row to the next mining pass.

| PR | Topic | State | Our impact | Prepared branch |
| -- | ----- | ----- | ---------- | --------------- |
| [#21455](https://github.com/shopware/shopware/pull/21455) | `sw-review` topic guides with rule IDs | open | WP2 `core_guide_ids`, WP7 | none yet |
| [#21541](https://github.com/shopware/shopware/pull/21541) | Backward-compatibility and HTTP cache guidelines | merged 2026-10-19 | WP7 phase B rules link to the guidelines; unblocked | not needed |
| [#21627](https://github.com/shopware/shopware/pull/21627) | PR template: What and why / How / Testing / Additional notes / Checklist | open | rewrite `shopware-pr-description/references/pr-body-template.md` and the `pr-no-ai-trailers` fixtures | draft [#23](https://github.com/BrocksiNet/ai-skills-shopware/pull/23) |
| [#21730](https://github.com/shopware/shopware/pull/21730) | Admin lint: no new `.js` in `src`, no new mixins; agent docs point at reference implementations, examples use `wrapComponentConfig()` | open | WP0 item 7, `admin-js-implementation-to-ts` grader; point `shopware-admin-js` at the named component, composable and store | draft [#24](https://github.com/BrocksiNet/ai-skills-shopware/pull/24) |
| [#21725](https://github.com/shopware/shopware/pull/21725) | Admin lint baselines that may only shrink (foundation of #21730) | open | none directly; merges before #21730 | not needed |
| [#21502](https://github.com/shopware/shopware/pull/21502) | `composer skills:enable` / `skills:disable` | open | `docs/skill-resolution.md`: the official way to hide core skills in a full install | after merge |

[#21722](https://github.com/shopware/shopware/pull/21722), the first home of
the Administration agent docs, was closed on 2026-10-20. The docs moved to
PR #21725 and then to #21730.

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

The ID column links a row to its entry in
[`rules/catalog.json`](../rules/catalog.json). `—` means the owning skill is
not tagged yet.

## Testing (`shopware-testing`)

| ID | Rule (from PR) | Target | Eval |
| -- | -------------- | ------ | ---- |
| TEST-025 | Tests as executable examples; scenario wiring visible in test body | `references/test-shape-and-flags.md` | defer-on-trunk |
| TEST-026 | Stable boilerplate in `setUp()`; shared collaborators when identity matters | same | defer-on-trunk |
| TEST-028 | Unit filesystem: `Filesystem` mock vs committed `_fixtures`; write disk via `Filesystem` | same | **done** (documented) |
| TEST-013 | Never `exit()` / `die()` in tests; `setAutoExit(false)` | same | defer-on-trunk (documented) |
| TEST-012 | No `ReflectionMethod::invoke` on Shopware privates | same | **done** → `no-reflection-on-shopware-method` |
| TEST-011 | One `#[CoversClass]` per unit/migration file | `core-platform-patterns.md` | **done** → `one-covers-class-per-file` |
| TEST-009 | Test `#[Package]` must match owning class (`TestPackageMatchRule`) | same | **done** (documented; existence eval already) |
| TEST-010 | Every test class `@internal` | same | **done** → `test-class-marked-internal` |
| TEST-014 | `StaticEntityRepository` generic inference / `::of()` | `test-shape-and-flags.md` | defer-on-trunk (documented) |
| TEST-027 | Named arguments on helper/builder literals | same + `php-foundation` | **done** (documented) |
| TEST-032 | `@codeCoverageIgnore` pass-through only (`CodeCoverageIgnoreEvaluationRule`) | `core-platform-patterns.md` | defer-on-trunk (documented) |
| TEST-001 | `expectExceptionObject` via domain factory (already covered) | `exception-assertions.md` | done |
| TEST-019 | No DBAL `Connection` behavior-mock in unit tests | `test-shape-and-flags.md` | defer-on-trunk |
| TEST-006 | Unit legacy flags: `#[DisabledFeatures]`; not `Feature::fake()` for current major | `test-shape-and-flags.md` | **done** → `unit-test-disable-newer-major` |
| TEST-006 | Dual-major unit tests disable the newer major (`#[DisabledFeatures(['v6.9.0.0'])]`) | same | **done** → `unit-test-disable-newer-major` |
| TEST-006 | Integration flags: `Feature::skipTestIfActive()` / `skipTestIfInActive()`; not `#[DisabledFeatures]` | `test-shape-and-flags.md` | **done** (runtime-enforced #18350; dual-major lanes #20117) |
| TEST-023 | Integration traits: only what the scenario needs (`KernelTestBehaviour` + `DatabaseTransactionBehaviour` for repository rollback) | `integration-repository.md` | **done** → `integration-narrow-test-traits` |
| TEST-024 | Test method `@deprecated tag:` when it asserts a throw while a major flag is active | `test-shape-and-flags.md` | **done** → `flag-active-throw-is-deprecated` |
| TEST-033 | `@codeCoverageIgnore` on production class uses FQCN `@see` on trunk | `core-platform-patterns.md` | defer-on-trunk |
| TEST-007 | No `#[CoversClass]` on integration tests (PHPStan) | `core-platform-patterns.md` | **done** → `integration-no-covers-class` |
| TEST-008 | Cross-test docblock uses `@see` + import, not FQCN prose | `core-platform-patterns.md` | **done** → `test-docblock-use-see` |
| TEST-009 | `#[Package('…')]` on every test class | `core-platform-patterns.md` | **done** → `test-class-has-package-attribute` |
| TEST-015 | `#[CoversNothing]` safeguard tests in `tests/devops/`, not `tests/unit/` | `core-platform-patterns.md` | **done** → `safeguard-test-not-in-unit-suite` |
| TEST-005 | Data providers: named `yield`, not `return []`; no `yield from` inline array | `test-shape-and-flags.md` | **done** → `unit-test-yield-provider` |
| TEST-029 | Provider names describe scenario, not raw inputs | same | defer-on-trunk |
| TEST-030 | Keep distinct edge cases in providers; don’t over-deduplicate | same | defer-on-trunk |
| TEST-031 | Legacy flag tests easy to delete when flag removed | same | defer-on-trunk |

## Core platform (`shopware-core-development` + `shopware-architecture`)

| ID | Rule (from PR) | Target | Eval |
| -- | -------------- | ------ | ---- |
| CORE-053 | Hexagonal services: infra at edge; services unit-testable without I/O | `shopware-architecture` + `service-architecture.md` | defer-on-trunk / **done** → `business-logic-in-controller` |
| CORE-033 | `@internal` adapters; `@final` on supported non-extension classes | same + `deprecations.md` | defer-on-trunk |
| CORE-057, CORE-058 | Conservative DTOs; public readonly value objects for simple structs | `service-architecture.md` | defer-on-trunk |
| CORE-059 | Public BC surface vs internal controllers/subscribers/loaders | same | defer-on-trunk |
| — | Bounded DAL reads (setLimit) | `shopware-architecture` → `dal-contracts.md` | **done** → `dal-search-without-limit` |
| — | Repository not Connection for entity reads | `dal-contracts.md` | **done** → `no-dal-connection-for-entity-read` |
| CORE-008 | New Admin/Store API routes → OpenAPI JSON under `Schema/.../paths` | `api-schema.md` (core) | skip (fixture-heavy) |
| — | New core Store API routes use extension events, not a new abstract route class | `shopware-architecture` → `extension-mechanisms.md` | **done** → `store-api-route-extension-event` |
| PLG-011 | Plugin/extension OpenAPI for custom routes | `shopware-plugin-development` → `api-contracts.md` | **done** → `store-api-openapi-required` |
| CORE-009 | Run `ApiRoutesHaveASchemaTest` for new/changed core API routes | `api-schema.md` | skip |
| CORE-020 | `Feature::silent()` when core must call deprecated API for BC | `deprecations.md` | **done** → `deprecation-silent-wrapper` |
| CORE-013 | Plan major breaks with `BCChange` attributes, not `@deprecated reason:*` | `deprecations.md` | **done** → `bc-change-not-deprecated-reason` |
| CORE-025 | Do not `<deprecated>` a DI service id core still references | `deprecations.md` | **done** (documented) |
| CORE-054 | Symfony `Filesystem` instead of raw PHP file functions | `service-architecture.md` | **done** → `symfony-filesystem-over-raw-php` |
| CORE-007 | Progressive enhancement / dual path behind flag | `shopware-architecture` → `progressive-enhancement.md` | **done** → `core-http-client-behind-flag` |
| CORE-021 | No new code paths calling deprecated APIs; move callers to replacement | `deprecations.md` | defer-on-trunk |
| CORE-023 | Inline `// @deprecated tag:` for private cleanup (not method `@deprecated`) | `deprecations.md` | defer-on-trunk |
| CORE-024 | Legacy tests for deprecated APIs; removable with flag/deprecation | `deprecations.md` | defer-on-trunk |
| CORE-037 | Migration class/file/`getCreationTimestamp()` = exact current Unix timestamp | `platform-architecture.md` | **done** → `migration-timestamp-format` |
| CORE-040 | No tests for empty/no-op `updateDestructive()` | `platform-architecture.md` | defer-on-trunk |
| CORE-010 | Release docs: external perspective; separate API vs Core sections | `release-notes-and-adr.md` | **done** (documented) |
| CORE-041, CORE-042, CORE-048 | `UPGRADE` = must third-party code change?; past tense; no repeated headings | `release-notes-and-adr.md` | **done** → `upgrade-entry-past-tense`, `release-info-no-duplicate-heading` |

## Security (`shopware-security`) — ours only

| ID | Rule | Target | Eval |
| -- | ---- | ------ | ---- |
| — | No hardcoded sales channel access keys in source | `secrets-and-config.md` | **done** → `no-access-key-in-source` |
| — | Store-API / Admin routes declare ACL | `api-acl-and-input.md` | **done** → `store-api-route-missing-acl` |
| — | App manifest least privilege | `apps-and-webhooks.md` | **done** → `app-manifest-least-privilege` |

## PR workflow

| ID | Rule (from PR) | Target | Eval |
| -- | -------------- | ------ | ---- |
| — | Follow `.github/PULL_REQUEST_TEMPLATE.md`; no extra PR sections | `shopware-pr-description` | defer-on-trunk |
| — | Conventional PR title when requested | `pr-body-template.md` | defer-on-trunk |
| — | Review/CI fixes → new commit; no amend/force-push unless asked | `shopware-pr-description` + `shopware-pr-review` | defer-on-trunk |
| — | No AI-agent attribution trailers (`Co-authored-by`, …) | `shopware-pr-description` | **done** → `pr-no-ai-trailers` |

## Review scope (`shopware-review-learnings`)

| ID | Rule (from PR) | Target | Eval |
| -- | -------------- | ------ | ---- |
| REV-026, REV-028 | Root-cause fix; grep callers before shared behavior changes | `references/change-scope.md` | defer-on-trunk |
| REV-029, REV-030 | Boyscout safe cleanups in touched file; mention broader cleanup, don’t expand PR | same | defer-on-trunk |
| REV-025 | Issue suggestions are hypotheses | same | defer-on-trunk |

## Skipped (core-only or out of scope)

| PR skill / rule | Reason |
| --------------- | ------ |
| `shopware-admin-js` | mined into our `shopware-admin-js`; defer short list on trunk |
| `shopware-knowledge-capture` | Overlaps our `AGENTS.md` / REGISTRY curation |
| `sw-triage`, `sw-bugfixer`, `sw-review`, `nightly-triage` | Core gh-aw CI workflows; explicit invocation only since [#18365](https://github.com/shopware/shopware/pull/18365) |

## Mining pass 2026-10-19

Trunk commits after the 2026-10-13 pass that changed `.agents/`,
`coding-guidelines/` or enforcement. Work package WP0 of
[`plans/2026-10-skills-evolution.md`](plans/2026-10-skills-evolution.md).

| Core PR | Rule | Our target | Status |
| ------- | ---- | ---------- | ------ |
| [#21438](https://github.com/shopware/shopware/pull/21438) (f2bf3794), [#21343](https://github.com/shopware/shopware/pull/21343) (190d734b) | Observe events through an owned dispatcher (unit) or `EventHookDispatcher::on()` (integration); capture in the hook, assert afterwards; no runtime listeners on the shared `event_dispatcher` (`NoAssertionInEventHookRule`, `NoRuntimeListenerOnSharedEventDispatcherRule`) | `shopware-testing` → `test-shape-and-flags.md` | **done** → `event-hook-capture-then-assert` |
| [#21572](https://github.com/shopware/shopware/pull/21572) (75b0a495) | Danger one-covers-class rule now checks every added or modified test file | `shopware-testing` → `core-platform-patterns.md` | **done** (wording; existing `one-covers-class-per-file`) |
| [#21400](https://github.com/shopware/shopware/pull/21400) (8dc74f24), [#21139](https://github.com/shopware/shopware/pull/21139) (7ad011f1) | `Feature::throwIfActive()` for deprecated exception classes and framework callbacks; discovery methods return neutral values when the removal flag is active | `shopware-core-development` → `deprecations.md` | defer-on-trunk (documented; PHPStan-enforced) |
| [#21599](https://github.com/shopware/shopware/pull/21599) (d10e3c4f) | Store API extension events may use arrow functions | `store-api-route-extension-event` | no change (skill text and grader do not constrain the callable) |
| [#21177](https://github.com/shopware/shopware/pull/21177), [#21660](https://github.com/shopware/shopware/pull/21660), [#21444](https://github.com/shopware/shopware/pull/21444) | Regex `D` modifier fixes, DAL accessor notice guard, telemetry | — | skip (no guidance change) |
| [#21541](https://github.com/shopware/shopware/pull/21541) | `backward-compatibility.md` and `http-cache-and-assets.md` guidelines (merged 2026-10-19) | WP7 phase B | unblocked; rules land with evals |

Contradictions with the `sw-review` guides in
[#21455](https://github.com/shopware/shopware/pull/21455), fixed in this pass:

| Guide rule | Was | Now |
| ---------- | --- | --- |
| MIG-007 | Admin roles migrated with SQL on `acl_role.privileges` | `MigrationStep::addAdditionalPrivileges()`; eval `admin-acl-role-migration` rewritten so the raw SQL migration is the near-miss |
| ADMF-001 (retired) | Admin flag names must be uppercase | Both spellings resolve; follow the surrounding code |
| MIG-004, MIG-005 | Heavy backfills go to `update()` or a command | Batched with deterministic order; derived data via indexer or `PostUpdateIndexer` |
| BCPHP-010 | "Prefer `final` over `@internal`" | One marker per surface: `@internal`, `@experimental`, `@final` or `final class` |

### Watch (open on 2026-10-19)

| Core PR | Why it matters here |
| ------- | ------------------- |
| [#21455](https://github.com/shopware/shopware/pull/21455) | `sw-review` guides with rule IDs; source of WP2 `core_guide_ids` and WP7. |
| [#21627](https://github.com/shopware/shopware/pull/21627) | New PR template sections (What and why, How, Testing, Additional notes, Checklist); rewrite `shopware-pr-description/references/pr-body-template.md` on merge. |
| [#21730](https://github.com/shopware/shopware/pull/21730) | Admin lint: no `.js` in `src`, no new mixins, `wrapComponentConfig()` required. WP0 item 7 waits for it. |
| [#21722](https://github.com/shopware/shopware/pull/21722) | Admin reference implementations named in `AGENTS.md`; point `shopware-admin-js` at them on merge. |
| [#21502](https://github.com/shopware/shopware/pull/21502) | `composer skills:enable` / `skills:disable`; document in `skill-resolution.md` on merge. |
| [#20437](https://github.com/shopware/shopware/pull/20437) | Storefront component skill (still WIP). |

## Mining pass 2026-10-13

Trunk PRs merged after the 2026-09-28 pass that changed guidance, and what
they mean here. "eval:TBD" means a candidate rule for our surface skills that
needs a failing model run on a real shop before it gets in (curation rule:
no rule without a demonstrated miss and an eval).

| Core PR | Rule | Our target | Status |
| ------- | ---- | ---------- | ------ |
| [#20840](https://github.com/shopware/shopware/pull/20840) | No helper traits composed into unit test classes; use a static fixture class or a stub under `Stub/` (lifecycle behaviours allowed) | `shopware-testing` → `core-platform-patterns.md` | defer-on-trunk |
| [#20863](https://github.com/shopware/shopware/pull/20863) | Sub-features link to their parent major; explicit env values and persisted toggles win over `FEATURE_ALL` and the parent major; set `V6_8_0_0=1` directly | `shopware-plugin-development` → `version-compatibility.md` | **done** (already consistent: we say `V6_8_0_0=1`, not `FEATURE_ALL`) |
| [#21157](https://github.com/shopware/shopware/pull/21157) | Every new compiler pass gets its own class-level `@internal` | `shopware-core-development` | defer-on-trunk |
| [#21026](https://github.com/shopware/shopware/pull/21026) | Twig-only template changes get no PHP integration test that renders Twig; a render without a Storefront request can cache empty request-dependent Twig globals | `shopware-storefront` (plugin storefront tests) | eval:TBD (root `AGENTS.md` covers trunk) |
| [#21166](https://github.com/shopware/shopware/pull/21166) | German snippets: "Du" in the Administration, "Sie" in the Storefront; core snippet files named by language (`storefront.de.json`), not locale | — | skip (core translation files; plugin naming not verified) |
| [#20482](https://github.com/shopware/shopware/pull/20482) | Admin deprecations: `Shopware.Feature.triggerDeprecationOrThrow` or the `deprecated: { version, comment }` option | `shopware-admin-js` | defer-on-trunk (core components only) |
| [#18740](https://github.com/shopware/shopware/pull/18740), [#18684](https://github.com/shopware/shopware/pull/18684) | `CompletionGuard` / `setAutoExit(false)`; `StaticEntityRepository::of(...)` | `shopware-testing` | defer-on-trunk (already listed above) |
| [#21445](https://github.com/shopware/shopware/pull/21445) | gh aw bump, CI engines on Sonnet 5.5 / Opus 5.5 | — | skip (CI) |

### Watch (open on 2026-10-13)

| Core PR | Why it matters here |
| ------- | ------------------- |
| [#21541](https://github.com/shopware/shopware/pull/21541) | Adds `coding-guidelines/core/backward-compatibility.md` and `http-cache-and-assets.md`. Overlaps `shopware-change-impact` (shared cache key, assets) and `shopware-core-development` (deprecation + UPGRADE in the same PR). Re-mine and add defer pointers once merged. |
| [#20437](https://github.com/shopware/shopware/pull/20437) | `shopware-storefront-component` skill. Would end "core has no storefront skill" and change the `core-overlay` profile in `skill-resolution.md`. |
| [#21455](https://github.com/shopware/shopware/pull/21455) | `sw-review` topic guides with catch/ignore evals; a model for evals on `shopware-pr-review` and `shopware-review-learnings`. |
| [#21502](https://github.com/shopware/shopware/pull/21502) | `composer skills:enable` / `skills:disable` in the core checkout only. Plugin projects still use `npx skills remove` / `add`. |

### Layout conventions seen on trunk

- Frontmatter `name`, `description`, `license: MIT` (adopted here in this pass).
- `agents/openai.yaml` per skill with a Codex display name, short
  description and default prompt (adopted here in this pass).
- Links to guidelines are conditional ("Read `coding-guidelines/…` when …"),
  not see-also lists. Adopted here for every `references/` index: each line
  says when to read the file.
- Descriptions start with an imperative or "Use when", followed by "Use when
  …" and "Do NOT use …". Adopted here for all skills; the quoted trigger
  lists are gone. The before/after activation comparison is inconclusive:
  the original adapter suppressed session-limit errors. Rerun it with the
  adapter that propagates errors before drawing an activation conclusion.
