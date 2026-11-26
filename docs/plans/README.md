# Plans and sub-agent handoffs

Active roadmaps and parallelizable handoff briefs live here. Completed plans
and finished handoffs move to [`done/`](done/) once their PRs merge.

## Active roadmaps

| Plan | Status | What remains |
| ---- | ------ | ------------ |
| [`2026-10-slim-skill-context.md`](2026-10-slim-skill-context.md) | Proposed (Phases 1–4 shipped; Phase 2–4 in PR [#212](https://github.com/BrocksiNet/ai-skills-shopware/pull/212)) | Phase 5 (smaller bodies) deferred; measure session activation with the routing hook before closing |
| [`2026-11-25-handoff-04-eval-baselines-and-reference-reads.md`](2026-11-25-handoff-04-eval-baselines-and-reference-reads.md) | Part 1 shipped in PR [#213](https://github.com/BrocksiNet/ai-skills-shopware/pull/213) | Part 2 triage of 5 `worse` + 11 zero-load tasks, Part 3 ceiling audit, Part 4 fresh multi-model baseline |

## Wave 2 — 2026-11-25 quality, speed & context handoffs (done)

All six handoffs ran in parallel on separate branches against `main`
(`a21660c0`, post-v0.19.0). Handoff 04 Parts 2–4 continue as Wave 3 above; the
rest moved to [`done/`](done/).

| Handoff | Shipped in |
| ------- | ---------- |
| [01 — CI & test speed](done/2026-11-25-handoff-01-ci-and-test-speed.md) | PR [#211](https://github.com/BrocksiNet/ai-skills-shopware/pull/211) |
| [02 — Slim context & routing](done/2026-11-25-handoff-02-slim-context-and-routing.md) | PR [#212](https://github.com/BrocksiNet/ai-skills-shopware/pull/212) |
| [03 — App rules & eval hygiene](done/2026-11-25-handoff-03-app-rules-and-eval-hygiene.md) | PR [#218](https://github.com/BrocksiNet/ai-skills-shopware/pull/218) |
| [04 — Eval baselines & reference reads](2026-11-25-handoff-04-eval-baselines-and-reference-reads.md) | Part 1 in PR [#213](https://github.com/BrocksiNet/ai-skills-shopware/pull/213); Parts 2–4 active |
| [05 — `sw-mcp-development` (WP F)](done/2026-11-25-handoff-05-mcp-skill-wp-f.md) | PRs [#214](https://github.com/BrocksiNet/ai-skills-shopware/pull/214), [#216](https://github.com/BrocksiNet/ai-skills-shopware/pull/216) |
| [06 — Admin API index & override rules (WP C/D/E)](done/2026-11-25-handoff-06-admin-api-index-and-rules-wp-cde.md) | PR [#217](https://github.com/BrocksiNet/ai-skills-shopware/pull/217) |

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
| [`done/2026-11-core-sources-and-admin-api.md`](done/2026-11-core-sources-and-admin-api.md) | WP A–F shipped; WP C descoped to 6.5–6.7 (core `public-api/` owns 6.8+), last parts in PRs [#214](https://github.com/BrocksiNet/ai-skills-shopware/pull/214) and [#217](https://github.com/BrocksiNet/ai-skills-shopware/pull/217) |
| [`done/2026-11-24-handoff-01-modern-web-guidance.md`](done/2026-11-24-handoff-01-modern-web-guidance.md) | Shipped in PR [#201](https://github.com/BrocksiNet/ai-skills-shopware/pull/201) |
| [`done/2026-11-24-handoff-02-admin-storefront-drift.md`](done/2026-11-24-handoff-02-admin-storefront-drift.md) | Shipped in PR [#200](https://github.com/BrocksiNet/ai-skills-shopware/pull/200) |
| [`done/2026-11-24-handoff-03-security-mcp-drift.md`](done/2026-11-24-handoff-03-security-mcp-drift.md) | Shipped in PR [#202](https://github.com/BrocksiNet/ai-skills-shopware/pull/202) |
| [`done/2026-11-24-handoff-04-issue-199-housekeeping.md`](done/2026-11-24-handoff-04-issue-199-housekeeping.md) | Shipped in PRs [#203](https://github.com/BrocksiNet/ai-skills-shopware/pull/203)–[#207](https://github.com/BrocksiNet/ai-skills-shopware/pull/207) |
