# Tooling quality checks

Run these checks from the repository root with Node 24. No model calls, PHP
runtime, Composer installation, or test-framework migration is involved.

```bash
npm ci --prefix tools
npm ci --prefix tools/api-index
npm ci --prefix evals/tools/ast
npm run typecheck --prefix tools
npm run lint --prefix tools
npm run format:check --prefix tools
npm run test:coverage --prefix tools
npm run test:coverage --prefix tools/api-index
```

The tooling coverage command runs the full `node --test` suite **and** every
golden grader. API-index coverage includes the local-Git workflow tests, which
build tagged snapshots, generate and reuse a compressed timeline, rebuild a
moving trunk, report extension facts and API diffs, and reject partial builds.
These fixtures exercise the actual CLIs without booting Shopware.

## Coverage scope

Both packages use pinned c8 configuration with `all: true`. Source, CLI and
(tooling) grader files that were never loaded remain in the denominator at
zero. Reports appear in `tools/coverage/` and `tools/api-index/coverage/`:
`index.html`, `lcov.info`, and `coverage-summary.json`. Child processes that
inherit `NODE_V8_COVERAGE` contribute; a child deliberately given an isolated
environment does not. File coverage is evidence of execution, not assertion
quality or successful production integration.

This replaces the audit's loaded-file-only measurement. Do not compare those
percentages as if the denominator and reporting engine stayed unchanged.
The initial all-file measurements are reporting baselines; there is no global
coverage-percentage gate yet. Review uncovered files and behavior before
raising a threshold. See [c8's all-source coverage documentation](https://github.com/bcoe/c8#checking-for-full-source-coverage-using---all).

## Targeted mutation checks

```bash
npm run mutate --prefix tools -- manifest
npm run mutate --prefix tools -- gate
npm run mutate --prefix tools -- findings
npm run mutate --prefix tools -- constraints
npm run mutate --prefix tools -- routing

# Check instrumentation and the selected test command without running mutants:
npm run mutate --prefix tools -- routing --dryRunOnly
```

Each profile mutates one production file and reruns only its selected offline
`node --test` files. The findings profile includes fast transcript-to-verdict
workflows; unrelated grader CLI subprocess tests are kept out of that repeated
command. Routing retains its recorded cases and borrowed-route workflows.
Stryker runs from the repository root so fixture paths remain valid in its
sandbox. Profiles have separate sandboxes and reports, two workers each, a
five-second timeout allowance, and a **95% minimum mutation score per profile**.
The policy test checks the threshold and target of every profile.
No mutation operators or survivor locations are silently excluded.

The command runner cannot select individual covering tests or distinguish
uncovered mutants, so `coverageAnalysis` is explicitly `off`. Its score is
scoped to the selected file and command, not the repository. Timeouts count as
detected in Stryker's score; inspect their reasons separately from assertion
kills. Do not turn every survivor into a test: some are equivalent guards,
private sentinel changes, or presentation-only mutations. Retain the report
and triage observable behavior. See [Stryker configuration](https://stryker-mutator.io/docs/stryker-js/configuration/).

Reports are retained under `tools/reports/mutation/<profile>/` as JSON and HTML.
The `tooling-quality` workflow runs coverage and the five bounded profiles on
tooling PRs, or selected profiles on manual dispatch. It uploads reports,
limits mutation jobs to two at once, and makes no model calls.

## Runtime and dependency contracts

- Grader exit 2 and other infrastructure failures are distinct from a model
  failing its code task. The retained-workdir regression test checks this path.
- Timeouts first signal the complete process group with `SIGTERM`, then force
  shutdown with `SIGKILL` after 500 ms. Deadline and drain timers are cleaned
  up, including when the leader exits before its descendants.
- Trial `pass`/`fail` statuses require exit 0/1. Infrastructure and skipped
  trials require another nonnegative integer exit code. JSON parsing and the
  strict manifest gate enforce the same invariant.
- The six hand-seeded audit survivors now have independent boundary tests:
  commit and repeat identity, unexpected tasks, duplicate repeat IDs, off-arm
  aggregates, and the inclusive maximum error percentage. The
  [replay evidence](quality-seeded-faults-2026-11-04.json) records assertion
  failures in an isolated copy; it is not a general mutation score.
- Manifest validation, result parsing, gate decisions, findings, version
  constraints, A/B decision logic and model-profile selection are tested for
  transitive independence from file I/O, revision lookup and process adapters.
  Creation and reading live in `eval-experiment.ts`, `eval-result-file.ts`, and
  `revision.ts`; agent/model metadata lives in `agent-config.ts`.

## Version constraints

The API index evaluates **stable numeric releases**, not Composer's complete
dependency solver. It supports exact versions (omitted components are zero),
`~`, `^`, trailing `.*` / `.x`, `*` / `x`, numeric comparisons including `!=`,
AND by spaces/commas, and OR by `|` / `||`. Operator whitespace is supported.
Known stability flags do not change stable-release membership; `-stable` is
accepted. Prerelease bounds, hyphen ranges, mixed wildcard comparisons and
malformed or unsafe numeric components return `undefined` instead of widening
the range. The facts layer reports an unreadable constraint to the caller.
The tested supported semantics follow [Composer's version-constraint documentation](https://getcomposer.org/doc/articles/versions.md).

## Original mutation baseline — November 4, 2026

Node 24.22.2, Stryker 10.1.1, no excluded mutation operators:

| Profile | Mutation score | Killed | Timeouts | Survived |
| ------- | -------------- | ------ | -------- | -------- |
| manifest | 96.34% | 184 | 0 | 7 |
| gate | 85.78% | 181 | 0 | 30 |
| findings | 95.07% | 212 | 0 | 11 |
| constraints | 91.25% | 218 | 1 | 21 |
| routing | 90.91% | 370 | 0 | 37 |

The constraint timeout is the comparison loop mutated from `index += 1` to
`index -= 1`; it does not terminate. These are five separate scope scores,
not a repository-wide average. Survivors remain in the JSON/HTML reports.
Examples include redundant type/range guards, changed diagnostic formatting,
and additional regex-boundary cases; not every survivor has been classified
as equivalent. The six original audit survivors were separately replayed and
all failed assertions.

The original reports exposed missing CLI workflow coverage for
`census-check.ts`, `check-breaks.ts` and `verify-facts.ts`. The follow-up below
closes those gaps with local Git, cache and report workflows. Network downloads,
release publication and a real Shopware runtime remain outside these checks.

## Original coverage and validation baseline

The [machine-readable measurements](quality-checks-2026-11-04.json) preserve the
original audit alongside the new scope, source hashes, mutation survivors, and
validation results.

| Package | Lines | Branches | Functions |
| ------- | ----- | -------- | --------- |
| Tooling + golden graders | 89.26% | 87.6% | 91.32% |
| API-index | 86.45% | 78.95% | 94.05% |

The clean-install run passed 501 tooling tests, 64 API-index tests,
41 AST snippet tests and all 638 golden cases across 219 tasks. Typecheck,
lint, formatting, skill validation, dry activation, ShellCheck and actionlint
also passed. These results were measured locally on Node 24.22.2; the new CI
workflow has been syntax-checked but has not been run on GitHub in this change.

## 95% gate and CLI workflow follow-up — November 4, 2026

All five profiles now pass `thresholds: { high: 95, low: 95, break: 95 }`.
Each CI matrix job runs one scoped profile with `node --test`; a profile below
95% fails the job. No operators or mutation locations are excluded, and review
classifications do not change the raw scores.

| Profile | Refreshed baseline | Final score | Assertion kills | Timeouts | Survived |
| ------- | ------------------ | ----------- | --------------- | -------- | -------- |
| manifest | 96.34% | 97.91% | 187 | 0 | 4 |
| gate | 85.78% | 99.05% | 209 | 0 | 2 |
| findings | 95.07% | 97.76% | 218 | 0 | 5 |
| constraints | 91.25% | 98.99% | 196 | 1 | 2 |
| routing | 90.91% | 97.30% | 396 | 0 | 11 |

The new assertions exercise complete GitHub summaries, experiment identity and
per-arm evidence diagnostics, citation normalization, Unicode file matching,
fixed versus diff-selected routing, missing targets, borrowed references, and
rendered routing hints. The summary goldens are user-visible Markdown artifacts,
including the evidence and reasons behind a failing gate.

The constraint parser now parses numeric versions and wildcards together and
uses exhaustive typed operator dispatch. A 3,364-case before/after comparison
found no changed outcomes relative to the refreshed baseline. Removing redundant parsing and unreachable fallback
paths changed its mutant population from 240 to 199; this is a behavior-preserving
refactor, not a claim that every disappeared mutant was killed by a new test.
The grouped delimiter regex remains in production to avoid unnecessary empty
allocations; its equivalent mutation is retained in the score.

All 24 remaining survivors have a recorded review in the
[machine-readable follow-up](quality-95-2026-11-04.json). They include redundant
guards, private sentinels, JSON Buffer coercion, and artificial marker inputs.
The marker cases remain counted as survivors; no marker-specific assertions
or exclusions inflate the score. The one detected timeout is still the
nonterminating comparison-loop mutation.

Run local mutation profiles one after another. A concurrent local run raced
while Stryker scanned another profile's sandbox during cleanup; routing was
rerun alone and its new report passed. CI matrix jobs use separate checkouts.

### Coverage and workflow behavior

All-file coverage was refreshed before and after the work on Node 24.22.2:

| Package | Lines before → after | Branches before → after | Functions before → after |
| ------- | -------------------- | ----------------------- | ------------------------ |
| Tooling + golden graders | 89.22% → 89.22% | 87.67% → 87.69% | 91.41% → 91.41% |
| API-index | 86.45% → 96.54% | 78.95% → 80.98% | 94.05% → 98.50% |

The 95% floor applies to each targeted **mutation score**. These coverage
percentages remain separate measurements; neither package has 95% branch
coverage.

The new CLI tests build temporary Git histories and real cached snapshots,
then run the actual command entry points:

- `census-check`: compressed census classes and units agree with built PHP
  classes and concrete methods; private, abstract, interface and out-of-scope
  records are handled deliberately. Differences in either direction fail.
- `check-breaks`: cached-index and local-repo modes agree, precision and recall
  accept the exact configured boundary, and selected majors are checked.
- `verify-facts`: generated extension facts are verified against Git source,
  including inherited flags, incorrect release boundaries and omitted flags.
- `api-facts`: human-readable and JSON output, explicit range overrides,
  applied patches, edited-tree diffs and stdin diffs are exercised. Applying a
  patch leaves the original extension untouched. Incomplete parsing and
  unresolved calls remain visible in the output.

The workflow tests reproduced three false passes and fixed them: no comparable
census tags, an unknown break-check major, and a malformed facts report formerly
exited zero without checking anything. They now exit **2** with an actionable
error. The three checking commands use **0** for a completed successful check,
**1** for a substantive mismatch, and **2** for invalid or unavailable inputs.
Invalid numeric options, partial snapshots, invalid optional metadata, malformed
fact ranges, missing releases and unavailable Git refs are rejected as data
errors. Facts-report validation is a small typed module separate from the CLI.

Validation passed **534 tooling tests, 83 API-index tests, 41 AST tests and 647
golden cases across 222 tasks**, plus strict typecheck, lint, formatting, skill
validation and dry activation. The terminal-cleanup regression now uses a test
deadline that includes V8 instrumentation overhead while still rejecting its
20-second fake cleanup hang. Published skills are unchanged. No model calls,
Shopware runtime, network fetch or release publication is needed for these
workflows. GitHub CI itself has not been dispatched by this local change.
