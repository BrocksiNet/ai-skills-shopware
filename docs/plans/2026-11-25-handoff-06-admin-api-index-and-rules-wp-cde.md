# Handoff 06: `BCChange` Attribution, Descoped Historical API Index, and Admin Override Rules (WP D5, C, E)

- **Base branch:** `origin/main` (at or after `a21660c0`, post-v0.19.0)
- **Suggested branch:** `feat/admin-api-index-wp-cde` (or split into small PRs per section)
- **Related plan:** [`2026-11-core-sources-and-admin-api.md`](2026-11-core-sources-and-admin-api.md#wp-c-admin-api-index-the-missing-surfaces) (re-verified 2026-11-25)
- **Parallelizable with:** Handoffs 01, 03, 04, and 05 (if Handoff 02 splits `sw-admin-js/references/architecture.md`, rebase before editing `sw-admin-js` in Part 3)
- **Prerequisite:** Read [`AGENTS.md`](../../AGENTS.md) and [`2026-11-core-sources-and-admin-api.md`](2026-11-core-sources-and-admin-api.md) (WP C, D, E) before editing.

## Goal

Finish the parts of WP C, D, and E that still add real value **without duplicating Shopware core's new Administration `public-api/` snapshot and break check** ([shopware/shopware#22591](https://github.com/shopware/shopware/issues/22591), `adr/2026-11-10-administration-public-api-snapshot.md`):

1. **WP D step 5:** Expose `BCChange` kind (`CallSiteCompatibilityChange` vs `ExtenderCompatibilityChange`) in `api-facts` and `api-diff`.
2. **WP A drift-source follow-up:** Track `adr/2026-11-10-administration-public-api-snapshot.md` and core's `valid-api-markers` / `generate-public-api` paths in `rules/sources.json`.
3. **WP C (descoped to non-overlapping gaps):** Only add surfaces core's 6.8+ `public-api/` snapshot does **not** solve — historical **6.5–6.7 cross-minor `api-facts`** (SCSS variables/mixins, snippet placeholders) and Storefront `{% if feature() %}`. Do **not** rebuild block crossings, `v-if` chains, scope vars, stores, services, routes, or registries in `tools/api-index/` now that core ships them in `#22907`–`#23370` + `admin:check-extensions`.
4. **WP E:** Add delta-proven Admin override safety rules to `sw-admin-js` (borrowed by `sw-extension-review`), aligned with core's new `@bc-change <Kind> version:vX` marker, `valid-api-markers` ESLint rule (`#22785`), and block break check (`#23163`).

## Scope of Changes

### 1. WP D step 5 — `BCChange` caller vs extender classification

- `tools/api-index/` already records `BCChange` attributes in `flags.bcChanges`.
- Update `api-facts` and `api-diff` output (and JSON schema) to state who has to act — **callers** (`CallSiteCompatibilityChange`), **extenders** (`ExtenderCompatibilityChange`), or both — based on the recorded attribute kind.
- Add unit tests in `tools/api-index/test/` covering caller-only, extender-only, and combined `BCChange` facts and diffs.

### 2. Drift sources for core's new Admin public-API snapshot (`rules/sources.json`)

- Add `adr/2026-11-10-administration-public-api-snapshot.md` mapped to `["sw-admin-js", "sw-core-development"]`.
- Inspect `src/Administration/Resources/app/administration/eslint.config.ts` (`valid-api-markers` from `#22785`) and `scripts/generate-public-api/` on `shopware/shopware` `trunk`; add any unwatched guideline or marker-spec paths so drift mining tracks `#22591`'s remaining PRs automatically.

### 3. WP C (descoped) — Historical 6.5–6.7 & Storefront flag gaps only

Focus strictly on what core's 6.8+ Admin snapshot cannot answer for multi-version plugins (`~6.6.0 || ~6.7.0`):

1. **Storefront `{% if feature() %}` flag states** in `tools/api-index/src/flag-state.ts` / storefront extractor (extending the Admin flag-state support shipped in WP C step 1).
2. **Historical 6.5–6.7 Admin SCSS variables/mixins (`~scss/variables`)** and **snippet keys with placeholders/plural forms** — only if a quick check on real 6.6/6.7 releases confirms actionable breaks plugins hit across 6.5–6.7 ranges.
3. **Acceptance tests** in `tools/api-index/test/` verifying byte-identical output and negative controls for every surface added.

Do **not** re-implement 6.8+ Admin block crossings, `v-if` chains, scope variables, services, stores, routes, directives, or registries in `tools/api-index/` — core `#22591` already owns those for trunk/6.8+ and will expose `admin:check-extensions --target=<major>`.

Bump `GENERATOR` in `tools/api-index/src/model.ts` when indexed data changes, and run `npm run bundle:check --prefix tools/api-index`.

### 4. WP E — Admin override safety rules (`sw-admin-js` + `sw-extension-review`)

Inspect core PRs `#22785` (`valid-api-markers` ESLint rule for `@bc-change <Kind> version:vX`) and `#23163` (block break check) first so we wire CI-enforced core checks into `trunk.enforced_by` rather than repeating them.

Evaluate each plugin/extension candidate against the five curation criteria in [`README.md`](../../README.md) (prove delta with local A/B before keeping):

- An override replacing a block without `{% parent %}` where the core block has a crossing element or continues a `v-if` chain.
- An override template referencing a slot or loop variable the block does not provide.
- An override defining a method the target component no longer has, or calling `$super` on a nonexistent name.
- `$parent` access and direct imports from core `src/` inside a plugin.
- Reading core `$refs` or styling core classes (advisory/minor, not blocking).
- Core/trunk guidance: use `@bc-change <Kind> version:vX` (not `@deprecated`) for breaking changes to Administration elements that stay, and point 6.8+ plugin/core authors to core's committed `public-api/` snapshot and `admin:check-extensions`.

For every rule that passes the criteria:

- Assign the next free `ADM-*` / `CORE-*` ID in `rules/catalog.json`, place it in a routed reference (respecting the <= 10 rules per reference budget), attach verified `trunk.enforced_by` where core CI catches it (`trunk_only: true`), wire `shopware-api` where facts answer the question, and add a review catch/ignore pair with golden pass + sneak fail fixtures.
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

For Part 4 (WP E), run local A/B evals (`EVAL_TASKS=... REPEATS=3 bash scripts/eval-local.sh`) on each new rule's catch/ignore pair and include the results table in the PR.

## Done Criteria

- `BCChange` caller vs extender attribution appears in `api-facts` and `api-diff` with unit tests.
- `rules/sources.json` tracks core's `adr/2026-11-10-administration-public-api-snapshot.md`.
- Descoped WP C additions pass unit + determinism tests without duplicating `#22591`'s 6.8+ Admin snapshot surfaces.
- Every new WP E rule has a catalog ID, routed reference, passing golden fixtures, accurate `trunk.enforced_by`, and A/B evidence in the PR body.
- All deterministic CI checks pass.
