# Plans and sub-agent handoffs

Active roadmaps and parallelizable handoff briefs live here. Completed plans
and finished handoffs move to [`done/`](done/) once their PRs merge.

## Active roadmaps

| Plan | Status | What remains |
| ---- | ------ | ------------ |
| [`2026-10-slim-skill-context.md`](2026-10-slim-skill-context.md) | Proposed (re-verified 2026-11-25; Phase 1 done) | Phase 3 first (`route.mjs --brief`/`--hook` to fix 8/332 session activation), then Phase 2 (slim descriptions + `"name-only"` paired with hook) and Phase 4 (forked review subagents); Phase 5 deferred |
| [`2026-11-core-sources-and-admin-api.md`](2026-11-core-sources-and-admin-api.md) | Accepted (re-verified 2026-11-25; WP A, B, C1–C2, D1–D4 done) | WP F `sw-mcp-development` (8 `AGENTS.md`, 5 PHPStan rules), WP D step 5 (`BCChange` caller vs extender), WP E Admin override rules aligned with `@bc-change`, and **descoped WP C** (6.5–6.7 historical `api-facts` + Storefront `{% if feature() %}` only; 6.8+ Admin snapshot now lives in core `#22591`) |

## Current wave — 2026-11-25 quality, speed & context handoffs

Designed so multiple sub-agents can work in parallel on separate branches or
worktrees against `main` (`a21660c0`, post-v0.19.0). File ownership is split to
minimize merge conflicts; where two handoffs touch generated artifacts
(`rules/catalog.json`, `skills/sw-skill-router/index.json`, `REGISTRY.md`),
rebase on `main` and re-run the renderers before opening the PR.

| Handoff | Suggested branch | Focus | Parallel notes |
| ------- | ---------------- | ----- | -------------- |
| [01 — CI & test speed](2026-11-25-handoff-01-ci-and-test-speed.md) | `perf/ci-and-test-speed` | In-process/parallel TS graders, synthetic fixture tree for slow unit tests, `validate.yml` cleanup, missing `skills` files, local A/B concurrency | Zero overlap with `skills/` or `rules/catalog.json`; **start first** to speed up every other handoff |
| [02 — Slim context & routing](2026-11-25-handoff-02-slim-context-and-routing.md) | `feat/slim-context-and-routing` | `route.mjs --brief`/`--hook` first (fix 8/332 activation), trim skill descriptions (<450 chars) + `"name-only"` paired with hook, split noisy `sw-testing` reference, cap rendered regex length, forked review variant | Re-run `render-routes` + `render-router-index` after rebasing |
| [03 — App rules & eval hygiene](2026-11-25-handoff-03-app-rules-and-eval-hygiene.md) | `feat/app-rules-and-eval-hygiene` | Tag `sw-app-development` (`APP-*`) with evals, add missing `fixtures/fail/` sneaks to 15 older tasks, add near-miss tasks, expand replay hand labels, refresh `docs/results.md` | Re-run renderers if `catalog.json` / `index.json` changed on `main` |
| [04 — Eval baselines & reference reads](2026-11-25-handoff-04-eval-baselines-and-reference-reads.md) | `feat/eval-baselines-and-ref-reads` | Track reference reads in A/B gate, triage 5 `worse` + 11 zero-load tasks, audit ceiling tasks, cut fresh multi-model baseline (all 244 tasks) | Instrumentation & triage can start immediately; run the full baseline after 01 and 02 merge |
| [05 — `sw-mcp-development` (WP F)](2026-11-25-handoff-05-mcp-skill-wp-f.md) | `feat/sw-mcp-development` | New experimental MCP tool authoring skill (8 `AGENTS.md`, 5 PHPStan rules), `rules/sources.json` MCP paths, MCP surface in `api-index`, `MCP-*` rules and evals | Fully parallel with 01–04 and 06; keep ACL ownership in `sw-security` (`SEC-011`) |
| [06 — Admin API index & override rules (WP C/D/E)](2026-11-25-handoff-06-admin-api-index-and-rules-wp-cde.md) | `feat/admin-api-index-wp-cde` | `BCChange` caller/extender facts (WP D5), descoped WP C (6.5–6.7 SCSS/snippets + Storefront `{% if feature() %}` only; core `#22591` owns 6.8+ Admin snapshot), Admin override rules aligned with `@bc-change` (WP E) | Can be split into small PRs; parallel with 01, 03, 04, 05 |

## Backlog (next wave, gated on review signals & delta proof)

Shopware domains not yet covered by dedicated guidance. Only promote a topic to
a handoff once `review-signals` or a real plugin review establishes a genuine
base-model delta (per the five curation criteria in [`README.md`](../../README.md)):

- Cart, Checkout, Rule Builder, and Flow Builder (`CartProcessor`/`CartCollector`, `CartBehavior`, custom `Rule` classes + Admin condition UI, Flow actions/storable events).
- OpenSearch / Elasticsearch custom indexing and mapping guidance.
- CMS elements, blocks, and `CmsElementResolverInterface` data resolvers.
- Scheduled Tasks & Messenger (`ScheduledTaskHandler`, idempotency, worker memory/timeouts, failure transport).
- `sw-local-dev` coverage for `devenv.nix` and `.devcontainer`.
- Retiring legacy `evals/smoke/` once `eval-local` covers all needed local agents.

## Completed (`done/`)

| Document | Outcome |
| -------- | ------- |
| [`done/2026-10-skills-evolution.md`](done/2026-10-skills-evolution.md) | WP0–WP12 shipped (v0.9.0–v0.19.0) |
| [`done/2026-10-wp11-public-api-index.md`](done/2026-10-wp11-public-api-index.md) | Phases 0–4 shipped (`api-facts`, `api-diff`, `shopware-api-index`) |
| [`done/2026-10-skill-update-automation.md`](done/2026-10-skill-update-automation.md) | All phases shipped (`mine-trunk`, `collect-reviews`, `suggest-rules`, `/draft`) |
| [`done/2026-11-24-handoff-01-modern-web-guidance.md`](done/2026-11-24-handoff-01-modern-web-guidance.md) | Shipped in PR [#201](https://github.com/BrocksiNet/ai-skills-shopware/pull/201) |
| [`done/2026-11-24-handoff-02-admin-storefront-drift.md`](done/2026-11-24-handoff-02-admin-storefront-drift.md) | Shipped in PR [#200](https://github.com/BrocksiNet/ai-skills-shopware/pull/200) |
| [`done/2026-11-24-handoff-03-security-mcp-drift.md`](done/2026-11-24-handoff-03-security-mcp-drift.md) | Shipped in PR [#202](https://github.com/BrocksiNet/ai-skills-shopware/pull/202) |
| [`done/2026-11-24-handoff-04-issue-199-housekeeping.md`](done/2026-11-24-handoff-04-issue-199-housekeeping.md) | Shipped in PRs [#203](https://github.com/BrocksiNet/ai-skills-shopware/pull/203)–[#207](https://github.com/BrocksiNet/ai-skills-shopware/pull/207) |
