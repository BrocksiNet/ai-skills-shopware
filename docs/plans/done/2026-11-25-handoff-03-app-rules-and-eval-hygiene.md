# Handoff 03: Tag `sw-app-development` Rules and Close Grader & Replay Hygiene Gaps

- **Base branch:** `origin/main` (at or after `a21660c0`, post-v0.19.0)
- **Suggested branch:** `feat/app-rules-and-eval-hygiene`
- **Parallelizable with:** Handoffs 01, 02, 04, 05, and 06 (rebase and re-run renderers if `rules/catalog.json` or `skills/sw-skill-router/index.json` change on `main` first)
- **Prerequisite:** Read [`AGENTS.md`](../../../AGENTS.md), [`REGISTRY.md`](../../../REGISTRY.md), and [`evals/README.md`](../../../evals/README.md) before editing.

## Goal

Close the highest-value skill-tagging, grader-hygiene, and routing-replay gaps identified in the v0.19.0 inventory:

1. Tag `sw-app-development` (`APP-001..`) in `rules/catalog.json` with real evals (currently **0** catalogued rules and only **1** eval task).
2. Add almost-pass sneak `fixtures/fail/` cases to the **15 older behavioral tasks** that currently lack one.
3. Add **near-miss review tasks** for commonly confused rule families (currently only 4 exist across 243 rules) and audit the 2 lone `-ignore` tasks.
4. Expand hand-labelled ground truth in `evals/routing-replay/` from **3** comments to **15–20** comments and refresh the stale coverage numbers in `docs/results/README.md`.

## Scope of Changes

### 1. Tag `sw-app-development` (`APP-*`) and add evals

Inspect `skills/sw-app-development/SKILL.md`, `references/manifest-and-permissions.md`, and `references/app-scripts.md`:

- Assign stable `APP-001..` IDs (using the `APP` prefix in `rules/catalog.json`) to the concrete, delta-bearing app rules inside the routed references (so `sw-extension-review` automatically borrows them and can cite `APP-*` IDs):
  - Manifest 3.0 schema, folder name matching `<meta><name>`, least-privilege permissions, and declared `<requirements>`.
  - No plugin-style PHP services / DI container / direct DAL `EntityRepository` inside an app.
  - App script placement (`Resources/scripts/<hook>/*.twig`), sandboxing, and hook-exposed services only.
  - Registration, webhook, and Admin-API request signature verification (coordinate with `sw-security` — do not duplicate `SEC-*` rules; link them via code spans and `see` in `rules/catalog.json`).
  - Admin UI via Meteor Admin SDK (`manifest.xml`), not Administration Vue plugins.
- Add `audience: ["app"]` on each entry and verify `sw-extension-review` borrows both references cleanly without `validate-rules` errors.
- Add **review pairs** (`review-<slug>-catch` / `-ignore` in `tools/graders/review-pairs.ts`) and/or behavioral tasks for each gradable `APP-*` rule, with golden `fixtures/pass/` and sneak `fixtures/fail/`.
- Also check why `app-manifest-least-privilege` had `loaded_on = 0` in the `2026-10-28` baseline and sharpen its prompt/fixture or `sw-app-development` activation wording if needed.

### 2. Add `fixtures/fail/` almost-pass sneaks to the 15 older behavioral tasks

Every new grader requires a `fixtures/fail/` sneak that would fool a naive token-only check. These 15 existing behavioral tasks currently lack `fixtures/fail/`:

1. `cache-tag-no-deprecated-event`
2. `deprecation-silent-wrapper`
3. `integration-no-covers-class`
4. `migration-timestamp-format`
5. `no-access-key-in-source`
6. `no-dal-connection-for-entity-read`
7. `phpstan-baseline-guardrail`
8. `safeguard-test-not-in-unit-suite`
9. `store-api-openapi-required`
10. `store-api-route-missing-acl`
11. `test-class-has-package-attribute`
12. `test-docblock-use-see`
13. `unit-test-exception-object`
14. `unit-test-passes`
15. `unit-test-yield-provider`

For each task:

- Inspect its grader in `tools/graders/<task>.ts` (or `evals/tools/ast/src/tasks/<task>.mjs`).
- Create `evals/tasks/<task>/fixtures/fail/` containing a realistic **almost-pass sneak** (e.g. token in a comment, wrong method/attribute placement, wrong argument, or leftover forbidden call).
- If the current grader erroneously passes the sneak, tighten the grader (using `stripComments`, `phpMethod`, `jsCallArgs`, or an AST predicate) while keeping `fixtures/pass/` green and accepting common compliant rewrites.

### 3. Add near-miss review tasks and audit lone `-ignore` tasks

- Add 4–6 new `review-<topic>-near-miss` tasks covering rule families where reviewers commonly cite a plausible-but-wrong rule ID:
  - DAL / performance (`ARCH-002` unbounded search vs `PLG-*` / `REV-*` N+1 or Dynamic Access).
  - Migrations (`PLG-028` merchant-customized data vs `PLG-019` unbatched backfill vs `PLG-030` destructive `update()`).
  - Cache (`PLG-007` deprecated `*CacheTagsEvent` vs `PLG-024` `CacheTagCollector::addTag()` version floor vs `IMP-008` cache key inputs).
  - Admin extension API (`ADM-039` component public API vs `PLG-001` core block missing in supported range).
- Audit the two lone `-ignore` tasks (`review-queue-custom-normalizer-ignore` and `review-reset-method-tag-ignore`): confirm whether they are intentional extra negative controls for existing rules (`REV-033`, `ARCH-001`) and document that explicitly in their `instruction.md` / grader comments so future audits don't flag them as orphaned.

### 4. Expand `evals/routing-replay/` hand labels and refresh `docs/results/README.md`

- Currently `evals/routing-replay/` has 34 recorded PRs but only **3 hand-labelled comments**.
- Review ~12–17 more recorded PRs in `evals/routing-replay/*/case.json` across `sw-testing`, `sw-core-development`, `sw-plugin-development`, `sw-admin-js`, `sw-storefront`, `sw-security`, and `sw-architecture` and add verified ground-truth `labels` (comment → rule ID + reference).
- Verify `node tools/bin/replay-routes.ts --corpus evals/routing-replay` and `tools/test/route-replay.test.ts` pass with all hand labels selected (or open a concrete follow-up note for any genuine route miss uncovered).
- Update the `"What is covered"` table in `docs/results/README.md` to reflect the real post-PR counts (active rules, rules with eval, eval tasks, review tasks, routing cases).

## Verification

```bash
node tools/bin/render-routes.ts
node tools/bin/render-enforced.ts
node tools/bin/render-router-index.ts
bash scripts/validate-skills.sh
bash scripts/run-activation-evals.sh
( cd evals/tools/ast && npm test )
( cd tools && npm run typecheck && npm run lint && npm run format:check && npm test )
bash evals/test-graders.sh
```

## Done Criteria

- `sw-app-development` rules have stable `APP-*` IDs in `rules/catalog.json`, borrowed routes in `sw-extension-review`, and passing evals.
- All 15 listed behavioral tasks have a meaningful `fixtures/fail/` sneak that fails `evals/test-graders.sh`.
- At least 4 new near-miss review tasks pass golden checks.
- `evals/routing-replay/` has >= 15 verified hand labels passing `route-replay.test.ts`.
- `docs/results/README.md` coverage counts match the repository.
- All deterministic CI checks pass.
