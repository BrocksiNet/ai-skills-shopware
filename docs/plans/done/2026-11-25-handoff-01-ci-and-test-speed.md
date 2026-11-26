# Handoff 01: Speed Up Deterministic CI, Unit Tests, and Local Eval Iteration

- **Base branch:** `origin/main` (at or after `a21660c0`, post-v0.19.0)
- **Suggested branch:** `perf/ci-and-test-speed`
- **Parallelizable with:** Handoffs 02, 03, 04, 05, and 06 (touches only repo tooling, workflows, and `evals/tasks/*/skills` — zero overlap with `skills/` content or `rules/catalog.json`)
- **Prerequisite:** Read [`AGENTS.md`](../../../AGENTS.md) and [`docs/testing-quality.md`](../../testing-quality.md) before editing.

## Goal

Cut deterministic validation and local iteration time by an order of magnitude without weakening any check or mutation gate:

1. Drop `bash evals/test-graders.sh` from **~2m 16s** to **< 10s**.
2. Drop `cd tools && npm test` from **~3+ min** to **< 15s**.
3. Trim redundant CI setup in `.github/workflows/validate.yml` and stop `run-evals` PRs from running unrelated tasks on single-skill edits.
4. Add opt-in task concurrency to `tools/src/eval-local.ts` for faster local A/B runs.

## Measured Bottlenecks

1. **`tools/src/test-graders.ts`** runs all ~717 golden cases (244 tasks × ~3 fixtures) strictly `inSeries`, spawning a fresh `node tools/bin/grade.ts` subprocess for every case — even though **234 of 244** graders are pure in-process TypeScript functions (`tools/graders/*.ts` and `review-pairs.ts`).
2. **`tools/test/discovery-pilot.test.ts`** (**26.2s**), **`tools/test/transfer-eval.test.ts`**, and **`tools/test/transfer-suite.test.ts`** (**35s+**) copy the entire real 20-skill `skills/` directory (and `tools/` + `evals/`) into temp dirs and SHA-256 hash them repeatedly per test.
3. **`.github/workflows/validate.yml`**:
   - `shellcheck` runs `sudo apt-get update && sudo apt-get install -y shellcheck` on every push even though `shellcheck` is pre-installed on GitHub `ubuntu-latest`.
   - `tools` runs `npm ci --prefix ../evals/tools/ast` even though `grader-golden` already installs and runs `evals/tools/ast`.
4. **`tools/src/eval-plan.ts`**: `selectTasks()` treats any task without a `skills` file as matching *every* changed skill. Currently **13 tasks** lack a `skills` file (`clock-interface-injection`, `unit-test-passes`, `unit-test-exception-object`, `discovery-app-plan`, `discovery-overview`, `discovery-plugin-review`, `no-contradiction-full-profile`, `transfer-acl-roundtrip`, `transfer-admin-caption`, `transfer-admin-save`, `transfer-cache-minor-floor`, `transfer-option-rename`, `transfer-worker-reset`), causing up to 78 extra model sessions per `run-evals` PR.

## Scope of Changes

### 1. In-process + bounded-parallel TS graders in `tools/src/test-graders.ts`

- For tasks **without** an `ownGradeSh` (`evals/tasks/<task>/grade.sh`), invoke `gradeTask(root, task, { workdir, transcript })` directly in-process instead of spawning `node tools/bin/grade.ts`.
  - Preserve exact isolation: still copy the fixture into a fresh temp workdir, read `.transcript.txt` (or empty string), catch thrown errors as exit `2` (so broken graders fail the same way), and delete the temp dir in `finally`.
  - Keep subprocess execution (`bash <grade.sh>`) for the 10 tasks that have their own `grade.sh` (AST graders).
- Run tasks (or cases) with bounded concurrency (e.g. `Math.min(os.availableParallelism(), 8)`, overridable via an option/env for deterministic tests), while buffering per-task output so stdout/stderr lines stay grouped cleanly per task in deterministic sorted order.
- Keep exit codes (`0` OK, `1` failures, `2` missing AST tools) and output format intact; verify `tools/test/` and `npm run test:coverage --prefix tools` still pass cleanly (note: in-process grading also improves c8 coverage measurement of `tools/graders/`!).

### 2. Synthetic fixture tree for `discovery-pilot`, `transfer-eval`, and `transfer-suite` tests

- Add a small shared helper under `tools/test/` that builds a minimal synthetic repo root (e.g. 3 tiny skills: `sw-skill-router`, `sw-help`, and one domain skill with a route + `routes.json`, plus minimal `evals/routing/` and `evals/tasks/` entries) inside `tmpdir()`.
- Switch unit tests in `tools/test/discovery-pilot.test.ts`, `tools/test/transfer-eval.test.ts`, and `tools/test/transfer-suite.test.ts` to use the synthetic fixture tree where they only test orchestration, manifest freezing, tamper detection, error stopping, and package isolation.
- Keep **one** lightweight real-repo test covering `merged` router parity against `evals/routing/` and real `transferOutcome` golden assertions so real-repo regressions are still caught.

### 3. Trim redundant CI setup in `.github/workflows/validate.yml`

- In `shellcheck`: guard installation with `command -v shellcheck >/dev/null 2>&1 || (sudo apt-get update && sudo apt-get install -y shellcheck)`.
- Check whether any test in `tools/test/` invokes `evals/tools/ast` (`grep` for `evals/tools/ast` in `tools/test/`). If none need it during `npm test --prefix tools`, remove `evals/tools/ast` from the `tools` job's `cache-dependency-path` and `npm ci` step (keep it in `grader-golden` and `quality.yml`'s `coverage` job). If a test does need it, leave `npm ci` in place and note why in the PR description.

### 4. Explicit `skills` files for untargeted eval tasks

- Audit the 13 tasks without a `skills` file:
  - Add an explicit `evals/tasks/<task>/skills` file to every task that targets specific skills (e.g. `clock-interface-injection` → `sw-php-foundation`, `unit-test-passes` and `unit-test-exception-object` → `sw-testing`, each `transfer-*` task → its target skill(s), each `discovery-*` task → `sw-skill-router` / `sw-help` as appropriate).
  - Leave `no-contradiction-full-profile` without a narrow `skills` file (it intentionally loads the full profile) or document its exception clearly.
- Verify `node tools/bin/eval-plan.ts` with `EVAL_CHANGED_FILES` containing a single skill (`skills/sw-storefront/SKILL.md`) only selects storefront tasks + intentional full-profile tasks.

### 5. Optional concurrency in `tools/src/eval-local.ts`

- Support an optional `EVAL_CONCURRENCY` integer env var (default `1`, validated with `envInt(..., 1, 1)`).
- When `> 1`, run up to `EVAL_CONCURRENCY` tasks concurrently while keeping JSONL appends atomic (each line appended complete) and printing clear task prefixes on stderr.
- Add unit tests in `tools/test/eval-local.test.ts` (including invalid `EVAL_CONCURRENCY=0` returning exit 2).

## Verification

Run all deterministic checks and record before/after wall-clock timings in the PR description:

```bash
bash scripts/validate-skills.sh
bash scripts/run-activation-evals.sh
( cd evals/tools/ast && npm test )
( cd tools && npm run typecheck && npm run lint && npm run format:check && npm test && npm test --prefix api-index )
time bash evals/test-graders.sh
```

Also verify the targeted mutation profiles remain >= 95% if any profiled file was touched (`npm run mutate --prefix tools -- manifest` etc.).

## Done Criteria

- `bash evals/test-graders.sh` passes all 244 tasks in < 15s locally with identical exit codes and clean grouped output.
- `cd tools && npm test` passes in < 20s locally without weakening any test assertion.
- Changing a single skill no longer pulls unrelated tasks into `eval-plan`.
- `validate.yml`, `oxlint`, `oxfmt`, `tsc`, and ShellCheck all pass cleanly.
