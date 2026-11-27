# Handoff 04: Reference-Read Telemetry, Baseline Triage, and Fresh Multi-Model Baseline

- **Base branch:** `origin/main` (at or after `a21660c0`, post-v0.19.0)
- **Suggested branch:** `feat/eval-baselines-and-ref-reads`
- **Timing:** Parts 1 and 2 can start immediately in parallel with Handoffs 01–03. **Part 4 (full baseline run)** should run after Handoffs 01 and 02 merge so it uses faster execution, accurate `skills` files, and the slimmer descriptions/routes.
- **Prerequisite:** Read [`AGENTS.md`](../../../AGENTS.md), [`docs/results/README.md`](../../results/README.md), and [`docs/contributing/testing-quality.md`](../../contributing/testing-quality.md) before editing.

## Goal

Make progressive-disclosure retrieval observable in the A/B gate, resolve the known regressions and zero-load tasks from the October baseline, and publish a fresh multi-model baseline covering all tasks.

## Background (from `evals/baselines/2026-10-28-claude.jsonl`)

- Latest committed baseline is from **2026-10-28** (`claude` only, 208 tasks — **36 newer tasks** from v0.16–v0.19 have never been baselined, and there is no `copilot` baseline yet).
- Verdict breakdown on `2026-10-28-claude.jsonl`: `43 improved`, `98 held`, `62 no_difference`, **`5 worse`**.
- **5 `worse` tasks:**
  1. `feature-impact-before-done` (`1/3` on vs `3/3` off)
  2. `review-admin-flag-old-branch-catch` (`0/3` on vs `3/3` off)
  3. `review-deprecation-internal-replacement-ignore` (`1/3` on vs `3/3` off)
  4. `review-migration-unbatched-backfill-ignore` (`1/3` on vs `3/3` off)
  5. `review-route-input-ignore` (`1/3` on vs `3/3` off)
- **11 tasks where the skill NEVER loaded (`loaded_on = 0`):**
  `app-manifest-least-privilege`, `clock-interface-injection`, `code-coverage-ignore-passthrough`, `named-arguments-for-literals`, `no-contradiction-full-profile`, `pr-no-ai-trailers`, `review-codecoverage-ignore-see-catch`, `review-codecoverage-ignore-see-ignore`, `review-deprecation-discovery-neutral-catch`, `unit-test-exception-object`, `unit-test-passes`.
- The Nov 4 transfer study in `docs/results/README.md` showed agents can invoke `SKILL.md` (`loaded_on = 1`) and still **skip reading the targeted `references/*.md`** — currently invisible in `ab.jsonl` and `eval-gate.ts`.

## Scope of Changes

### 1. Record reference reads in `ab-run.ts` and `eval-gate.ts`

- Inspect `tools/src/reference-reads.ts` (already built and unit-tested in `tools/test/reference-reads.test.ts`), `tools/src/ab-run.ts`, `tools/src/eval-results.ts`, and `tools/src/eval-gate.ts`.
- Extend `AbResult` with optional diagnostic fields (backward-compatible with existing baselines):
  - `refs_read_on?: number | null` (number of skill-on runs whose trace returned content from at least one `references/*.md` file inside an installed skill)
  - `refs_read_off?: number | null`
- Display reference-read rates in `abSummary` and `eval-gate.ts`'s Markdown summary as a **diagnostic metric first** (do not add a hard gate failure threshold until the first fresh baseline establishes normal rates; note that skills with 0 references like `sw-php-foundation` should report `null` / `n/a`).
- Keep `tools/test/eval-results.test.ts`, `tools/test/ab.test.ts`, and the `gate` + `manifest` Stryker mutation profiles >= 95% (remember `dependency-boundaries.test.ts`: pure gate/result modules must stay independent of file I/O!).

### 2. Triage the 5 `worse` and 11 zero-load tasks

- Run local A/B checks (`EVAL_TASKS=... REPEATS=3 bash scripts/eval-local.sh`) on the 5 `worse` tasks first:
  - For the three `-ignore` false positives, inspect whether the rule wording is over-triggering on clean diffs or whether the grader/fixture needs refinement (never weaken a grader just to get a pass; fix the rule's precision or false-positive boundary!).
  - For `review-admin-flag-old-branch-catch` (`0/3` on vs `3/3` off) and `feature-impact-before-done`, inspect the traces to see why skills-on hurt (wrong rule ID cited? conflicting instruction? missed reference?).
- Check the 11 `loaded_on = 0` tasks (note: PR #206 fixed counting a Claude `Read` of `SKILL.md` as a loaded skill, so several may already load now!). Re-run those 11 tasks and fix any remaining activation or `skills` file gaps.

### 3. Audit ceiling (`held` / `no_difference`) tasks

- Produce a short triage report (in the PR description or a follow-up issue) for the `98 held` + `62 no_difference` tasks:
  - Flag rules with `held` across runs that have **no** `keep_reason` as candidates for retirement or sharper blind fixtures (per `docs/maintaining/README.md` and `rules/catalog.schema.json`).
  - Evaluate whether adding a fast **discriminating subset** flag/file (e.g. `EVAL_SUITE=core`) would let PRs run a ~30–40 task high-signal suite in minutes while keeping the full 244-task run on the monthly schedule.

### 4. Cut a fresh baseline (after Handoffs 01 & 02 merge)

- Trigger `.github/workflows/evals.yml` with `agents=copilot` and `baseline=true` (and optionally a local/CI `claude` run) across all tasks so `evals/baselines/` has an up-to-date multi-model baseline covering all 244+ tasks.

## Verification

```bash
( cd tools && npm run typecheck && npm run lint && npm run format:check && npm test )
npm run mutate --prefix tools -- manifest
npm run mutate --prefix tools -- gate
bash scripts/validate-skills.sh
bash evals/test-graders.sh
```

## Done Criteria

- `ab.jsonl` and `eval-gate.ts` report reference-read telemetry (`refs_read_on`) cleanly while staying backward-compatible with older baseline JSONL files and keeping `gate` + `manifest` mutation scores >= 95%.
- All 5 previously `worse` tasks are investigated, fixed or documented, and re-verified with local A/B runs.
- Previously zero-load tasks are re-measured post-#206 and any genuine activation misses are resolved.
- A fresh baseline PR is opened (or queued once Handoffs 01–02 land).
