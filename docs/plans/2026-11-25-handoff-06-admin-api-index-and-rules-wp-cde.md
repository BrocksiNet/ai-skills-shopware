# Handoff 06: Finish Admin API Index Surfaces, `BCChange` Callers/Extenders, and Admin Override Rules (WP C, D5, E)

- **Base branch:** `origin/main` (at or after `a21660c0`, post-v0.19.0)
- **Suggested branch:** `feat/admin-api-index-wp-cde` (or split into one small PR per surface)
- **Related plan:** [`2026-11-core-sources-and-admin-api.md`](2026-11-core-sources-and-admin-api.md#wp-c-admin-api-index-the-missing-surfaces)
- **Parallelizable with:** Handoffs 01, 03, 04, and 05 (if Handoff 02 splits `sw-admin-js/references/architecture.md`, rebase before editing `sw-admin-js` in Part 3)
- **Prerequisite:** Read [`AGENTS.md`](../../AGENTS.md) and [`2026-11-core-sources-and-admin-api.md`](2026-11-core-sources-and-admin-api.md) (WP C, D, E) before editing.

## Goal

Complete the remaining Admin/Storefront public API index work and pair it with high-signal Admin extension-safety rules:

1. **WP D step 5:** Expose `BCChange` kind (`CallSiteCompatibilityChange` vs `ExtenderCompatibilityChange`) in `api-facts` and `api-diff`.
2. **WP C (remaining surfaces):** Add the missing Admin/Storefront API index surfaces plugins break on silently, with acceptance tests from real core PRs.
3. **WP E:** Add delta-proven Admin override safety rules to `sw-admin-js` (and borrow them in `sw-extension-review`), calling `shopware-api` instead of guessing wherever the index has the fact.

## Scope of Changes

### 1. WP D step 5 — `BCChange` caller vs extender classification

- `tools/api-index/` already records `BCChange` attributes in `flags.bcChanges`.
- Update `api-facts` and `api-diff` output (and JSON schema) to state who has to act — **callers** (`CallSiteCompatibilityChange`), **extenders** (`ExtenderCompatibilityChange`), or both — based on the recorded attribute kind.
- Add unit tests in `tools/api-index/test/` covering caller-only, extender-only, and combined `BCChange` facts and diffs.

### 2. WP C — Remaining Admin & Storefront API index surfaces

Ship in small, reviewable increments (one PR or commit per surface), each with `ItemKind` / extractor, `api-diff` break classification, `api-facts` lookup, and byte-identical determinism checks:

1. **Block context & cross-block structure (highest real-world pain):**
   - Open `v-if` chains, `v-for` variables, and slot variables exposed inside a block (regression test from core PR #20959, which dropped `itemIndex`).
   - Elements and `v-if` chains that cross block boundaries (core PR #20959 / fix #21189).
   - Inherited blocks of public children of `@private` base components.
2. **Admin SCSS, snippets, `$refs`, and CSS classes:**
   - SCSS variables and mixins (`~scss/variables`).
   - Snippet keys with placeholders and plural forms.
   - Template `$refs` (break) and static CSS classes (warn/info, not break).
3. **Admin string-keyed registries & runtime APIs:**
   - Filters, directives, ACL privileges, registries, event bus events, routes/modules, mixins, `inject`, services, and Pinia/Vuex store members.
4. **Remaining flag-state gaps:**
   - Props, methods, emits, and `position-identifier`s behind feature flags, `Shopware?.Feature` calls, and Storefront `{% if feature() %}`.
5. **Acceptance tests:** Add recorded acceptance fixtures from real core commits (core PRs #20959, #17339, #15271, plus a small bug-fix negative control) in `tools/api-index/test/`.

Remember to bump `GENERATOR` in `tools/api-index/src/model.ts` when indexed data changes, and run `npm run bundle:check --prefix tools/api-index`.

### 3. WP E — Admin override safety rules (`sw-admin-js` + `sw-extension-review`)

Evaluate each candidate against the five curation criteria in [`README.md`](../../README.md) (especially delta — prove with local A/B before keeping!):

- An override replacing a block without `{% parent %}` where the core block has a crossing element or continues a `v-if` chain.
- An override template referencing a slot or loop variable the block does not provide.
- An override defining a method the target component no longer has, or calling `$super` on a nonexistent name.
- `$parent` access and direct imports from core `src/` inside a plugin.
- Reading core `$refs` or styling core classes (advisory/minor, not blocking).
- Core side (`sw-core-development` / `sw-admin-js`): adding a cross-block element, moving a block under a new parent, dropping a slot variable, or renaming a block only behind a major flag without `@deprecated`.

For every rule that passes the criteria:

- Assign the next free `ADM-*` / `CORE-*` ID in `rules/catalog.json`, place it in a routed reference (respecting the <= 10 rules per reference budget), wire `shopware-api` where facts answer the question, and add a review catch/ignore pair with golden pass + sneak fail fixtures.
- Re-render `render-enforced`, `render-routes`, and `render-router-index`.

## Verification

```bash
bash scripts/validate-skills.sh
bash scripts/run-activation-evals.sh
( cd evals/tools/ast && npm test )
( cd tools && npm run typecheck && npm run lint && npm run format:check && npm test )
( cd tools/api-index && npm test && npm run bundle:check )
bash evals/test-graders.sh
```

For Part 3 (WP E), run local A/B evals (`EVAL_TASKS=... REPEATS=3 bash scripts/eval-local.sh`) on each new rule's catch/ignore pair and include the results table in the PR.

## Done Criteria

- `BCChange` caller vs extender attribution appears in `api-facts` and `api-diff` with unit tests.
- Targeted WP C surfaces pass acceptance tests (core PRs #20959, #17339, #15271 + negative control) with byte-identical output across repeated runs.
- Every new WP E rule has a catalog ID, routed reference, passing golden fixtures, and A/B evidence in the PR body.
- All deterministic CI checks pass.
