# Handoff 02: Slim Skill Context, Cut Routing Noise, and Add Brief/Hook Router Modes

- **Base branch:** `origin/main` (at or after `a21660c0`, post-v0.19.0)
- **Suggested branch:** `feat/slim-context-and-routing`
- **Related plan:** [`2026-10-slim-skill-context.md`](../2026-10-slim-skill-context.md) (Phases 3, 2, and 4 — in that priority order; Phase 5 token-budget gate deferred)
- **Parallelizable with:** Handoffs 01, 03, 04, 05, and 06 (rebase and re-run `render-routes`, `render-router-index`, and `validate-skills` if another handoff updates `skills/` or `rules/catalog.json` first)
- **Prerequisite:** Read [`AGENTS.md`](../../../AGENTS.md) and [`2026-10-slim-skill-context.md`](../2026-10-slim-skill-context.md) before editing.

## Goal

Fix silent non-activation (2026-11-25 telemetry: only **8 of 332 sessions** loaded our skills; listing cost **22×** more tokens than loaded bodies/files) and cut wasted reference reads without losing recall:

1. **First (highest priority):** Implement `route.mjs --brief` and `route.mjs --hook` (Phase 3 of the slim-context plan) plus `use-cases/` wiring for hook-driven activation and Claude Code `skillOverrides` (`"name-only"` — only recommended alongside the hook, never standalone).
2. Slim all 20 frontmatter `description` fields from `~2,966` tokens combined to `~1,500–1,800` tokens (keeping every skill well below 500 chars; `sw-plugin-development` is currently at `1,005 / 1,024` chars).
3. Cut router noise in `evals/routing-replay/` (currently **2.26 noisy references per PR** out of 4.38 selected) by narrowing overly broad anchors and splitting oversized references.
4. Shrink rendered route tables inside `SKILL.md` (currently **19%** of all `SKILL.md` bytes, and **68% / 8.4 KB** in `sw-extension-review/SKILL.md`), and evaluate `context: fork` for self-contained review skills (`sw-extension-review`, `sw-pr-review` — remember a forked subagent has no conversation history).

## Scope of Changes

### 1. Slim frontmatter descriptions (Phase 2 of slim-context plan)

Audit and tighten the longest descriptions first while keeping crisp trigger phrases and clear `Do NOT use for ...` boundaries:

- `sw-plugin-development` (`1,005c` → target `<= 480c`)
- `sw-local-dev` (`850c` → target `<= 450c`)
- `sw-openapi-dto` (`803c` → target `<= 450c`)
- `sw-architecture` (`763c` → target `<= 450c`)
- `sw-admin-js` (`703c` → target `<= 450c`)
- `sw-storefront` (`700c` → target `<= 450c`)
- `sw-core-development` (`659c` → target `<= 450c`)
- Review remaining skills above 500c (`sw-app-development`, `sw-extension-review`, `sw-php-foundation`, `sw-testing`, `sw-skill-router`, `sw-review-learnings`).

Move non-trigger prose (examples, version details, secondary explanations) into the skill body or references. Keep `"load before editing"`-style urgency where earlier A/B runs showed Haiku needed it (note the Phase 2 risk in `2026-10-slim-skill-context.md`), and verify no trigger-phrase overlaps appear in `validate-skills.sh`.

### 2. Cut routing noise and split oversized references

Measured from `node tools/bin/replay-routes.ts --corpus evals/routing-replay`:

- **`skills/sw-testing/references/test-shape-and-flags.md` (`12.4 KB`, 19 selected / 15 with no comment):**
  - Its anchor `(::|->)(assert[A-Z]\w*|markTest(Skipped|Incomplete))\(` matches nearly every PHPUnit assertion in any test file.
  - Split `test-shape-and-flags.md` into two focused references (for example, data providers/feature flags/reflection vs test assertions/event hooks/coverage), each with narrow anchors and <= 10 rules (per WP7's budget rule).
  - Update `skills/sw-testing/routes.json`, `skills/sw-extension-review/routes.json` (borrowed routes), `rules/catalog.json` (`file` paths), and any affected `evals/routing/*/expected.json` or `evals/routing-replay/*/case.json`.
- **Other files exceeding WP7's 10-rule or ~10 KB soft budget:**
  - Inspect `sw-testing/SKILL.md` (15 inline rules), `sw-php-foundation/SKILL.md` (14 inline rules, `paths: "**/*.php"` loads all of them on every PHP file), `sw-core-development/references/deprecations.md` (13 rules), `sw-admin-js/references/architecture.md` (13 rules), and `sw-plugin-development/references/version-compatibility.md` (13.2 KB).
  - Move or split cleanly where it reduces per-change load without breaking `sw-extension-review` borrowed references or `rules/catalog.json` links.
- Re-run `node tools/bin/replay-routes.ts --corpus evals/routing-replay`: noise per PR must drop noticeably while keeping recall >= the floor in `tools/test/route-replay.test.ts` and all hand labels selected.

### 3. Cap rendered regex length in `SKILL.md` route tables

- Inspect `tools/src/routes.ts` (the table renderer behind `tools/bin/render-routes.ts`).
- Long regexes (such as the ~300-character comment regex on `sw-review-learnings/references/code-comments.md`, which also repeats in `sw-extension-review/SKILL.md`) bloat `SKILL.md` without helping the model.
- Cap each displayed anchor token in the Markdown table (e.g. truncate individual regexes > 50–60 chars with `…`, or allow an optional short `hint` field in `routes.json` while keeping the full regex in `routes.json` and `index.json` for `route.mjs`).
- Keep `tools/test/routes.test.ts` and the `routing` Stryker mutation profile >= 95%.

### 4. Implement `route.mjs --brief` and `route.mjs --hook` (Phase 3)

- Enrich `tools/src/router-index.ts` so each route in `skills/sw-skill-router/index.json` includes the active rule IDs and short titles defined in that reference (from `rules/catalog.json`).
- Add `--brief` to `skills/sw-skill-router/scripts/route.mjs`: prints a compact pointer list (2–10 lines: matched skill, reference path, rule IDs + one-line titles, and why it matched) with no verbose prose.
- Add `--hook` to `skills/sw-skill-router/scripts/route.mjs`: computes the `--brief` output, compares a hash of the matched set against a small state file under the repository's `.git/` dir (safe for worktrees via `git rev-parse --git-dir`), and prints nothing when the routed set did not change since the last call.
- Add unit tests in `tools/test/skill-router.test.ts` covering `--brief`, `--hook` repeat suppression, worktree git dirs, and JSON output compatibility.
- Document the optional hook snippet and Claude Code `skillOverrides` (`name-only`) profile in `use-cases/` and `docs/installation.md` (explicitly pairing `"name-only"` with the hook so activation does not regress).
- Optionally add a `context: fork` note or variant for `sw-extension-review` and `sw-pr-review` (self-contained diff/PR skills; do not use `context: fork` on build skills that rely on conversation history).

### 5. Re-render generated files

```bash
node tools/bin/render-routes.ts
node tools/bin/render-enforced.ts
node tools/bin/render-router-index.ts
```

## Verification

```bash
bash scripts/validate-skills.sh
bash scripts/run-activation-evals.sh
node tools/bin/replay-routes.ts --corpus evals/routing-replay
( cd tools && npm run typecheck && npm run lint && npm run format:check && npm test )
npm run mutate --prefix tools -- routing
bash evals/test-graders.sh
```

Before merging, run a local activation check (`scripts/run-activation-evals.sh` with a real agent) and a spot A/B on `prepare-plugin-for-6-8` + 2–3 changed skills (`EVAL_TASKS=... bash scripts/eval-local.sh`) to confirm slimmer descriptions did not lose activations.

## Done Criteria

- Total always-on description chars across all 20 skills drops by at least 35% (and every skill is <= 550 chars).
- `sw-extension-review/SKILL.md` size drops substantially (no 300-char raw regexes in the Markdown table).
- `replay-routes.ts --corpus evals/routing-replay` shows lower noise per PR while holding recall and all hand labels.
- `route.mjs --brief` and `--hook` work with zero runtime dependencies and pass unit tests.
- All deterministic CI checks and the `routing` 95% mutation gate pass.
