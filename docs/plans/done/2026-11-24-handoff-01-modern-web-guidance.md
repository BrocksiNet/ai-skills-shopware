# Handoff 01: Integrate Google Chrome Modern Web Guidance 1.0 as Default Companion

- **Base branch:** `origin/main` (at or after `2e48485f`, post-[#198](https://github.com/BrocksiNet/ai-skills-shopware/pull/198))
- **Suggested branch:** `feat/modern-web-guidance-default`
- **Parallelizable with:** Handoffs 02 and 03 (rebase and re-run renderers if `REGISTRY.md`, `rules/sources.json`, or `skills/sw-skill-router/index.json` change on `main` first)
- **Prerequisite:** Read [`AGENTS.md`](../../../AGENTS.md) before editing.

## Goal

Integrate Google Chrome's [Modern Web Guidance 1.0](https://developer.chrome.com/docs/modern-web-guidance) ([`GoogleChrome/modern-web-guidance`](https://github.com/GoogleChrome/modern-web-guidance), `v1.0.2`) as a **default companion skill** — installed via `npx skills add GoogleChrome/modern-web-guidance --skill modern-web-guidance`, **not** vendored — and guide agents to use it by default for generic web-platform CSS, HTML, JS, Core Web Vitals, and accessibility work while keeping Shopware primitives authoritative.

## Context and Precedence Policy

Previously this repository explicitly forbade installing Google's `modern-web-guidance/SKILL.md` next to ours because its description triggers aggressively (`MANDATORY: Execute FIRST for all HTML/CSS and clientside JS tasks`).

Modern Web Guidance 1.0 (`v1.0.2`, stewarded by Chrome, Edge, Firefox, and MDN) now ships:

- 200+ expert-vetted guides with a zero-dependency local offline CLI (`search`, `retrieve`, `legacy-scan`, `.mwgrc`).
- Two skills: `modern-web-guidance` (~205 tokens) and `chrome-extensions` (~175 tokens).
- Measured +36–41 pp uplift on web-platform tasks.

Install **`--skill modern-web-guidance` only** (exclude `chrome-extensions`) as a default companion alongside our frontend skills, with a strict **Shopware-first precedence policy**:

1. **Storefront primitives win:** Bootstrap storefront components (`SF-003`), Twig blocks, theme inheritance, and `PluginManager` plugins (`SF-002`) override generic MWG recommendations for dialogs, popovers, dropdowns, collapses, offcanvas, and custom selects.
2. **Checkout/session cache safety wins:** No speculation rules or prerender on cart, checkout, account, or wishlist (`SF-004`).
3. **Administration primitives win:** Meteor `mt-*` components (`mt-modal`, `mt-popover`, `mt-banner`, `mt-select`) and existing `sw-*` components override raw `<dialog>`, Popover API, or custom `<select>`.
4. **Use MWG proactively for everything Shopware does not own:** LCP/INP/CLS optimization, container queries, `:has()`, custom SCSS layout/typography/color, focus/a11y, autofill/form UX, CSP/Trusted Types, scroll/view behaviors — run `search` → `retrieve` and adapt the retrieved pattern to Twig/SCSS/Vue rather than pasting framework-agnostic demos.

## Scope of Changes

### 1. Flip agent guidance from "do not install" to "default companion, Shopware primitives win"

- **`skills/sw-research-and-escalation/references/modern-web-guidance.md`**:
  - Document installation (`npx skills add GoogleChrome/modern-web-guidance --skill modern-web-guidance`, alternative `npx modern-web-guidance@latest install`, and `DISABLE_TELEMETRY=1`).
  - Document the CLI workflow (`search`, `retrieve`, `.mwgrc` for Baseline/origin-trial policy, and when **not** to run `legacy-scan` — only for broad codebase modernization, never on focused feature edits).
  - Keep and sharpen the Shopware browser/primitive precedence rules above.
- **`skills/sw-storefront/SKILL.md`** and **`skills/sw-storefront/references/cache-and-modern-web.md`**:
  - Guide agents to use the companion `modern-web-guidance` skill for generic CSS/HTML/JS/CWV/a11y concerns after checking Shopware primitives, while keeping `SF-002`, `SF-003`, `SF-004`, and `SF-005` as hard guardrails.
- **`skills/sw-admin-js/references/flags-and-modern-web.md`**:
  - Update the modern-web gate to point agents to the companion `modern-web-guidance` skill for non-Meteor web platform concerns (container queries in custom Admin CSS, INP in custom widgets, a11y), while keeping Meteor `mt-*` authoritative.
- **`skills/sw-research-and-escalation/evals/should-trigger.md`**:
  - Replace line 10 (`Shopware already has a Bootstrap modal here. Do not install Modern Web Guidance as a skill.`) with a prompt reflecting Shopware-first precedence over an installed `modern-web-guidance` skill.

### 2. Surface `modern-web-guidance` in `sw-skill-router` and `sw-help`

- Inspect `skills/sw-skill-router/scripts/route.mjs`, `tools/src/router-index.ts`, `skills/sw-skill-router/SKILL.md`, and `tools/test/skill-router.test.ts`.
- When routing selects Storefront or Admin frontend work (`sw-storefront` or `sw-admin-js` is in `load`), check whether `modern-web-guidance` is installed in the discovered `skillDirs`:
  - **Installed:** Surface it in the router output (and JSON report) as a companion skill with a concise Shopware-first precedence reminder (Bootstrap in Storefront, Meteor `mt-*` in Admin; use `modern-web-guidance` for generic CSS/HTML/JS/CWV/a11y).
  - **Not installed:** Print the companion install command (`npx skills add GoogleChrome/modern-web-guidance --skill modern-web-guidance`) under recommended companion installs without breaking the existing `missing` command for `BrocksiNet/ai-skills-shopware`.
- Add unit tests in `tools/test/skill-router.test.ts` covering both installed and missing states (plus non-frontend diffs staying quiet).
- Mention `modern-web-guidance` as the default frontend companion in `skills/sw-help/SKILL.md`.

### 3. Update install docs, use-cases, registry, and drift sources

- **`README.md`**: Document `modern-web-guidance` as a default frontend companion install, and fix the stale *"five upstream skill sets"* count in `## Staying current` to match `rules/sources.json`.
- **`docs/installation.md`**: Add `npx skills add GoogleChrome/modern-web-guidance --skill modern-web-guidance` under companion installs alongside `shopware/shopware-cli`.
- **`use-cases/storefront-development.md`**: Promote Modern Web Guidance from "Optional CLI / do not install" to a default companion skill install right next to the frontend one-liner (keep `DISABLE_TELEMETRY=1` note).
- **`docs/tooling-stack.md`** and **`docs/skill-resolution.md`**: Update references that currently say *"Do not install their `SKILL.md` next to ours"*.
- **`REGISTRY.md`**: Update the coverage matrix row (`sw-research-and-escalation`) and the Sources table (`Apache-2.0` code / `CC-BY-4.0` guides; install as companion, do not vendor).
- **`rules/sources.json`** (and **`docs/.mining-state.json`** if required by schema/validator): Add a `modern-web-guidance` source tracking `GoogleChrome/modern-web-guidance` (`branch: "main"`, `extractor: "markdown"`, `paths: ["skills/modern-web-guidance/SKILL.md"]`) mapped to `["sw-research-and-escalation", "sw-storefront", "sw-admin-js"]`. Verify against `rules/sources.schema.json` and `tools/bin/validate-skills.ts`.

### 4. Update the `mwg-only-after-shopware-primitive` grader

- **`tools/graders/mwg-only-after-shopware-primitive.ts`** currently fails if any `modern-web-guidance/SKILL.md` exists in `workdir`.
- Update it so it grades the actual behavioral requirement (`SF-003`: Bootstrap modal used, no raw `<dialog>` / `showModal()` / `popover` replacing the storefront modal) without forbidding an installed `modern-web-guidance` skill.
- Confirm `fixture/`, `fixtures/pass/`, and `fixtures/fail/` under `evals/tasks/mwg-only-after-shopware-primitive/` still pass `evals/test-graders.sh`.

## Verification

Run all deterministic checks before opening a PR:

```bash
node tools/bin/render-routes.ts
node tools/bin/render-router-index.ts
bash scripts/validate-skills.sh
bash scripts/run-activation-evals.sh
( cd evals/tools/ast && npm test )
( cd tools && npm run typecheck && npm run lint && npm run format:check && npm test )
bash evals/test-graders.sh
```

## Done Criteria

- No remaining doc or skill claims that `modern-web-guidance/SKILL.md` must not be installed.
- Shopware-first precedence (`SF-002`, `SF-003`, `SF-004`, Meteor `mt-*`) is explicit in `sw-storefront`, `sw-admin-js`, `sw-research-and-escalation`, and `sw-skill-router`.
- `sw-skill-router` detects installed vs missing `modern-web-guidance` on frontend diffs and is covered by unit tests.
- All CI checks (`validate-skills`, `tools`, `grader-golden`, `markdown-lint`) pass.
