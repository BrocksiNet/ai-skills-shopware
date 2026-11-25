# Handoff 02: Adopt Shopware Admin `public-api/` Snapshot, Jest Harness, and JS Deprecation Guards

- **Base branch:** `origin/main` (at or after `2e48485f`, post-[#198](https://github.com/BrocksiNet/ai-skills-shopware/pull/198))
- **Suggested branch:** `chore/adopt-shopware-admin-storefront-drift`
- **Source issue:** [#199](https://github.com/BrocksiNet/ai-skills-shopware/issues/199) (`Drift: week of 2026-11-23`)
- **Parallelizable with:** Handoffs 01 and 03 (rebase and re-run renderers if `REGISTRY.md`, `rules/catalog.json`, or `skills/sw-skill-router/index.json` change on `main` first)
- **Prerequisite:** Read [`AGENTS.md`](../../../AGENTS.md) before editing.

## Goal

Adopt the Shopware trunk Administration and Storefront changes reported in drift issue [#199](https://github.com/BrocksiNet/ai-skills-shopware/issues/199):

1. Administration public API snapshot migration (`blocks-list.json` → `public-api/`).
2. Administration 6.8 extension Jest harness replacement for removed `test/_helper_/majorFeatureFlags`.
3. Newly CI-enforced Storefront and Administration ESLint deprecation rules (`trunk.enforced_by`).

## Upstream Commits to Inspect

Inspect each commit directly with `gh api repos/shopware/shopware/commits/<sha>` before writing `enforced_by` details or wording:

1. **`12f5ea91`** — `feat(administration): generate the block tree of the public API snapshot (#22907)`
   - Replaced `composer admin:generate-blocks-list` + `src/Administration/Resources/app/administration/blocks-list.json` with `composer admin:generate-public-api` + `src/Administration/Resources/app/administration/public-api/`.
   - Snapshot freshness is checked by `scripts/generate-public-api/committed-snapshot.spec.ts`.
   - `UPGRADE-6.8.md` also documents removal of `test/_helper_/majorFeatureFlags` in favor of `composer admin:setup-extension-tooling` and `shopwareAdminJestConfig` from `./.shopware/jest.mjs`.
2. **`52d16a75`** — `feat(storefront): require runtime guards for deprecated JavaScript APIs (#21833)`
   - Added ESLint rule `sw-core-rules/require-deprecation-guard: error` in `src/Storefront/Resources/app/storefront/eslint.config.js`.
   - Added `### Runtime deprecations in storefront JavaScript` in `coding-guidelines/core/feature-flags.md` (`window.Feature.triggerDeprecationOrThrow('v6.8.0.0', message)` and `this._deprecateOption(key, majorFlag, hint)`).
3. **`b77de7a9`** — `feat(administration): add the no-manual-deprecation-notices lint rule (#21680)`
   - Added ESLint rule `sw-deprecation-rules/no-manual-deprecation-notices: error` in `src/Administration/Resources/app/administration/eslint.config.ts`.
4. **`bf610b93`** — `feat(administration): require deprecated APIs to trigger their deprecation first (#22153)`
   - Added ESLint rule `sw-deprecation-rules/require-deprecation-guard: error` in `src/Administration/Resources/app/administration/eslint.config.ts`.
   - Updated `coding-guidelines/administration/feature-flags-and-deprecations.md` (guard must be the first statement; exceptions for `@private`, `_`-prefixed identifiers, lifecycle hooks, `data`, `watch`, `provide`, `inject`, store `state`/`getters`).

## Scope of Changes

### 1. Administration `public-api/` snapshot and 6.8 Jest harness

- **`skills/sw-admin-js/routes.json`**:
  - Add `**/public-api/**` alongside `**/blocks-list.json` on the `references/extension-api.md` route so both 6.7 plugins and 6.8/trunk changes route properly.
- **`skills/sw-admin-js/references/extension-api.md`** and **`REGISTRY.md`**:
  - Update extension API guidance and coverage-matrix wording to include `public-api/` (keeping `blocks-list.json` noted for 6.7 compatibility).
  - Note: `ADM-040` (`blocks-list.json entries and position identifiers are a contract`) is currently `retired` in `rules/catalog.json` — keep its retired status untouched unless re-evaluating with A/B evidence; do not reuse its ID.
- **`evals/routing/`**:
  - Check existing routing cases; add or update a case if needed so `public-api/` routing is tested.
- **`skills/sw-admin-js/references/testing.md`**:
  - Check for any stale mention of `majorFeatureFlags` and document the 6.8 extension Jest harness (`composer admin:setup-extension-tooling` + `shopwareAdminJestConfig` from `./.shopware/jest.mjs`) if it fits cleanly without duplicating existing rules.

### 2. Wire new JS deprecation ESLint rules into `trunk.enforced_by`

- Read the actual ESLint rule implementations in commits `52d16a75`, `b77de7a9`, and `bf610b93` so `catches` and `misses` are exact (per [`AGENTS.md`](../../../AGENTS.md)).
- Inspect existing deprecation rules in `rules/catalog.json` (`ADM-*`, `SF-*`, `CORE-*`).
- Add/update `trunk.enforced_by` entries (`tool`, `kind`, `catches`, `misses`, `trunk_only: true`) for:
  - `sw-deprecation-rules/require-deprecation-guard`
  - `sw-deprecation-rules/no-manual-deprecation-notices`
  - `sw-core-rules/require-deprecation-guard`
- Check whether Storefront JS runtime deprecation guards (`window.Feature.triggerDeprecationOrThrow` / `this._deprecateOption`) need a new rule in `sw-storefront` or `sw-core-development` (check `REGISTRY.md` single-owner rule and README's 5 inclusion criteria):
  - If adding a rule: assign next free ID, add catalog entry with `trunk.source: "coding-guidelines/core/feature-flags.md#runtime-deprecations-in-storefront-javascript"` and `trunk.enforced_by`, add activation prompt, and add a behavioral or review-pair eval with `fixtures/pass/` and an almost-pass sneak `fixtures/fail/`.
  - If existing rules already cover it: attach `trunk.enforced_by` to the matching rule(s) only.

### 3. Re-render generated sections

```bash
node tools/bin/render-enforced.ts
node tools/bin/render-routes.ts
node tools/bin/render-router-index.ts
```

## Verification

```bash
bash scripts/validate-skills.sh
bash scripts/run-activation-evals.sh
( cd evals/tools/ast && npm test )
( cd tools && npm run typecheck && npm run lint && npm run format:check && npm test )
bash evals/test-graders.sh
```

## Done Criteria

- `sw-admin-js` routes and docs cover `public-api/` alongside `blocks-list.json` for 6.7.
- All three new ESLint deprecation rules are accurately reflected in `rules/catalog.json` and rendered into the owning `SKILL.md`'s `Already enforced by CI` section.
- Every new rule (if any) has an eval task with passing golden `fixtures/pass/` and sneak `fixtures/fail/`.
- All deterministic CI checks pass.
