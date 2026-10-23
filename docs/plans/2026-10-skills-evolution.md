# Skills evolution plan (2026-10)

Status: **accepted** (2026-10-19) · Author: BrocksiNet · Created: 2026-10-19

This plan turns the 2026-10-19 trunk review into work packages. It covers
trunk drift since the 2026-10-13 mining pass, the review-guide design in
[shopware/shopware#21455](https://github.com/shopware/shopware/pull/21455),
and the related guideline PR
[#21541](https://github.com/shopware/shopware/pull/21541).

Every work package has a goal, a spec, the files it touches, and acceptance
criteria. Packages are ordered so that each one only depends on earlier ones.

## Overview

| ID | Work package | Depends on | Size | Model cost |
| -- | ------------ | ---------- | ---- | ---------- |
| WP0 | Fix drift and contradictions | none | S | none |
| WP1 | Make model evals real | none | M | yes |
| WP2 | Rule IDs and rule catalog | none | M | none |
| WP3 | "Do not flag" sections | WP2 | S | none |
| WP4 | Path-based reference routing | WP2 | M | none |
| WP5 | Review-shaped evals | WP2 | M | yes |
| WP6 | `sw-extension-review` skill | WP2, WP3, WP4, WP5 | L | yes |
| WP7 | Rule backlog from the core guides | WP2, WP5 | L | yes |
| WP8 | Automated trunk mining | WP2 | M | none |
| WP9 | Upstream watchlist | none | S | none |
| WP10 | Eval runner in TypeScript | none | M | none |
| WP11 | Public API index and version facts | WP6 | L | weekly build |
| WP12 | Skill update automation | WP8, WP9 | L | local only |

Shipped: everything through WP10 landed in **v0.9.0** (2026-10-21), ahead
of the milestones below. Still open: WP0 item 7 (waits for #21730) and
WP11 phase 4; phases 0 to 3 (the PHP index, `api-facts`, and `api-diff`
for routes, entities, feature flags and configuration) passed their gates. v0.10.0 (2026-10-21) added five rules from a real plugin review
(ADM-042..044, SEC-008, PLG-032); ADM-044 is the first catch task where the
skill wins the A/B (3/3 on, 0/3 off). PR #46 met the WP6 A/B acceptance
with review pairs that turn on version and API facts: PLG-007 (3/3 on, 0/3
off), SF-009 (3/3, 0/3) and ADM-009 (2/3, 0/3) win too, and no `-ignore`
task has more false positives with the skill on (Haiku, 3 repeats). v0.11.0
(2026-10-22) ships it, with the PR description template from
shopware/shopware#21627 (PRD-001..009). v0.12.0 (2026-10-22) ships WP11
phases 0 to 2: the API index and `api-facts`. v0.13.0 (2026-10-22) ships
phase 3: routes, entities, feature flags and configuration in the index,
and `api-diff`. v0.14.0 (2026-10-23) renames every skill to `sw-`
and adds `sw-skill-router` and `sw-help`.

Suggested milestones, as planned:

1. **v0.9.0**: WP0, WP1, WP2, WP9. Truthful evals and stable rule IDs.
2. **v0.10.0**: WP3, WP4, WP5, WP8. Cheaper context, review evals, automated mining.
   WP10 runs alongside and lands before WP5 adds review-shaped tasks to the runner.
3. **v0.11.0**: WP6, WP7. Extension review skill and the new rule backlog.

WP11 has no milestone. Each phase ships only if it passes its measured
gate.

---

## WP0: Fix drift and contradictions

Status: **done 2026-10-19**, except item 7, which waits for #21730. The same
pass also documented `Feature::throwIfActive()` from #21400 and #21139.

Goal: bring existing guidance back in line with trunk and with the core
review guides before adding anything new.

### WP0 changes

| # | Change | File | Source | Eval |
| - | ------ | ---- | ------ | ---- |
| 1 | Replace "migration on `acl_role.privileges`" with a privilege migration that calls `addAdditionalPrivileges()`; never write `acl_role` directly | `skills/sw-admin-js/references/architecture.md` | core guide MIG-007 | new `acl-privilege-migration-helper`, or extend `admin-acl-role-migration` |
| 2 | Drop "Admin flag names are uppercase". Say both spellings resolve and follow the surrounding code | `skills/sw-admin-js/references/flags-and-modern-web.md` | core retired ADMF-001 | none (removal) |
| 3 | Replace "heavy work belongs in `update()` or a command" with: batch about 1,000 rows with a deterministic `ORDER BY` and a cursor, or register an indexer or post-update indexer for derived data | `skills/sw-plugin-development/references/migrations.md` | MIG-004, MIG-005 | `migration-batched-backfill` (WP7) |
| 4 | Change "Danger fails new test files" to "every added or modified test file" | `skills/sw-testing/references/core-platform-patterns.md` | trunk 75b0a495 (#21572) | existing `one-covers-class-per-file` |
| 5 | Add "observing events in tests": no listeners on the shared `event_dispatcher`; unit tests use a dispatcher the test owns (`CollectingEventDispatcher`); integration tests use `EventHookDispatcher::fromContainer()->on()`; capture in the hook, assert afterwards, assert that the hook fired | `skills/sw-testing/references/test-shape-and-flags.md` + one checklist line in `SKILL.md` | trunk f2bf3794 (#21438), 190d734b (#21343) | new `event-hook-capture-then-assert` |
| 6 | Reconcile `final` vs `@internal` advice into one rule | `skills/sw-core-development/references/platform-architecture.md` and `service-architecture.md` | BCPHP-010 | none |
| 7 | Add `wrapComponentConfig()` for new Administration components | `skills/sw-admin-js/SKILL.md` | open #21730, #21722 | after #21730 merges |

### Eval spec: `event-hook-capture-then-assert`

- **instruction.md**: "Add an integration test proving that creating a
  product dispatches `ProductEvents::PRODUCT_WRITTEN_EVENT` with the new id."
- **fixture/**: a minimal integration test class skeleton with
  `IntegrationTestBehaviour` and an empty test method.
- **AST predicate** `evals/tools/ast/src/tasks/event-hook-capture-then-assert.mjs`:
  - PASS when the test method calls `EventHookDispatcher::fromContainer(...)->on(...)`
    or builds a `CollectingEventDispatcher`, the closure body has no
    `static::assert*`, `self::assert*`, `$this->assert*` or `fail()` call, and an
    assertion on the captured variable follows the code under test.
  - FAIL when `addListener`, `addSubscriber` or `removeListener` is called on
    `getContainer()->get('event_dispatcher')` or `EventDispatcherInterface`.
  - FAIL when there is any assertion inside the closure.
- **fixtures/fail/** (the near-miss): uses `EventHookDispatcher::on()` correctly
  but asserts inside the closure.

### WP0 acceptance

- All seven changes are merged. `validate-skills.sh` and `test-graders.sh` pass.
- `docs/core-pr-17657-alignment.md` has a "Mining pass 2026-10-19" section
  listing f2bf3794, 75b0a495, 190d734b, 8dc74f24 and 7ad011f1, each with a status.

---

## WP1: Make model evals real

Goal: the scheduled `evals.yml` run must produce real numbers and must be able
to fail.

Status: **done 2026-10-20**. Acceptance was met with `scripts/eval-local.sh`
and Claude Haiku: the clean run passed the gate, and a deliberately wrong rule
in `sw-plugin-development` turned `prepare-plugin-for-6-8` from 3/3 to
0/3 and the gate red. Free CI models proved weak for this: most ignore
skills, and the best one (LongCat) hits rate limits, so CI runs retry and the
gate now also fails when skills are not loaded or leak into "off" runs.
History: implemented 2026-10-19. The runner, gate, plan and diff scripts
are covered by `evals/runner/selftest.sh` without model calls. Change from the
spec: CI defaults to OpenCode with a free model (`opencode-task.sh`,
`opencode-activation.sh`), so no API key or secret is needed; GitHub Models,
the other keyless option, was retired on 2026-07-30. Claude Code stays
available with `agent=claude` and `ANTHROPIC_API_KEY`. The schedule is monthly.
The baseline PR needs "Allow GitHub Actions to create and approve pull
requests". Beyond the spec,
`ab.sh` also reports `held` (exit 11, on = off = repeats) and `error` (exit 5).
The gate also fails when more than 25 % of runs are agent errors, and A/B jobs
run as parallel shards picked by `scripts/eval-plan.sh`.

### Problems found

1. The `SKILLS_AGENT_CMD` and `AGENT_API_KEY` secrets are not set, so every
   scheduled run since setup skipped Layers 1 to 3 and reported success.
2. `evals/runner/ab.sh` always exits 0. The workflow's `fail` counter can
   never increase, so the threshold check is dead code.
3. Without `SKILLS_PROFILE_ON_CMD` and `SKILLS_PROFILE_OFF_CMD`, the "on" and
   "off" runs use the same skill set. The A/B comparison then measures noise.
4. One agent command serves both activation, which needs read-only tools, and
   behavioral tasks, which need edit tools.
5. `REPEATS` defaults to 1, which is too noisy for a pass or fail gate.

### WP1 spec

#### Runner contract changes

- `ab.sh` exit codes: `0` for improved, `10` for no difference, `20` for worse,
  `2` for a usage error, `3` when the agent is not configured.
- `ab.sh` writes one JSON line per task to `$EVAL_RESULTS`, default
  `evals/.results/ab.jsonl`:

  ```json
  {"task":"dal-search-without-limit","repeats":3,"on":3,"off":1,"delta":2,"verdict":"improved","agent":"claude","model":"sonnet","sha":"<git sha>","ts":"2026-10-20T06:00:00Z"}
  ```

- Split the agent variables:
  - `SKILLS_ACTIVATION_CMD` for Layer 1, defaulting to `evals/runner/claude-activation.sh`.
  - `SKILLS_AGENT_CMD` for Layers 2 and 3.
- Add `evals/runner/claude-task.sh` as the behavioral adapter. It reads the
  prompt on stdin and runs `claude -p` in the current working directory with
  `--setting-sources project`, edit tools allowed and `--max-turns 12`. It
  prints the transcript.
- Add `evals/runner/skills-profile.sh on|off <workdir>`. It symlinks the task's
  skill set into `<workdir>/.claude/skills` for `on`, and removes it for `off`.
  `run-task.sh` calls it with the workdir instead of `eval`-ing a global command.

#### Workflow changes in `.github/workflows/evals.yml`

- The guard step fails with `exit 1` on `schedule` and `workflow_dispatch` when
  a secret is missing. It keeps the warning and skip only for labeled PRs from forks.
- Add an input `repeats`, default 3, and an input `tasks`, default all.
- Gate rules:
  - Fail when any task has `verdict == "worse"`.
  - Fail when the share of `improved` or `held` tasks with `on == repeats` is below 70 %.
  - Report `no difference` tasks as a warning list. These are candidates for removal.
- Upload `evals/.results/` as an artifact and write a Markdown summary table to
  `$GITHUB_STEP_SUMMARY`.
- Cost guard: add a `max_tasks` input and stop the job after 45 minutes.

#### Baseline tracking

- Commit a monthly baseline to `evals/baselines/<YYYY-MM-DD>.jsonl` through a
  bot PR. A reviewable history beats a 90-day artifact (decision 1).
- `scripts/eval-diff.sh <old.jsonl> <new.jsonl>` prints the tasks whose verdict changed.

### WP1 files

- `evals/runner/ab.sh`, `evals/runner/run-task.sh`
- new `evals/runner/claude-task.sh`, `evals/runner/skills-profile.sh`, `scripts/eval-diff.sh`
- `.github/workflows/evals.yml`
- `evals/README.md`, `docs/smoke-evals.md`

### WP1 acceptance

- A manual dispatch with `tasks=dal-search-without-limit,no-empty-explicit repeats=3`
  produces `ab.jsonl` and a summary table.
- A deliberately broken skill, such as an emptied `sw-architecture/SKILL.md`
  on a test branch, turns the run red.
- ShellCheck passes on all new scripts.

---

## WP2: Rule IDs and rule catalog

Goal: every rule has a stable ID that links it to its skill, its eval, its
trunk source and the matching core guide ID. Mining then becomes a diff of
ID sets.

Status: **done 2026-10-20**. `sw-testing` (34 rules),
`sw-plugin-development` (26) and `sw-review-learnings` (32) are
tagged; 29 of the 92 rules have an eval, the rest record an `eval_reason`.
The validator runs inside `validate-skills.sh`, so CI checks it on every
push. It first shipped as `scripts/validate-rules.sh` (bash and `jq`) and was
ported to TypeScript as `tools/bin/validate-rules.ts` on 2026-10-20, see
[Repo tooling](#repo-tooling-typescript). Changes from the spec: the prefix table lives in the catalog
(`prefixes`), so the validator needs no copy of it; a rule is defined inline
exactly once, and other text points at it with a code span (`` `PLG-011` ``),
which the validator also resolves; review findings that restate another
skill's rule list it in a new `see` field. The three skills were tagged by
hand, so `rules-bootstrap` was not needed, and the alignment doc's ID
column is hand-written until `tools/bin/render-alignment.ts` exists. The other skills
are tagged when they are next touched; WP3, WP4 and WP5 can start now.

### ID format

`<PREFIX>-<NNN>`, zero-padded to three digits, never reused. Retired IDs stay
in the catalog with `status: retired`.

| Prefix | Owning skill |
| ------ | ------------ |
| `PHP` | `sw-php-foundation` |
| `CORE` | `sw-core-development` |
| `PLG` | `sw-plugin-development` |
| `APP` | `sw-app-development` |
| `ARCH` | `sw-architecture` |
| `SEC` | `sw-security` |
| `TEST` | `sw-testing` |
| `REV` | `sw-review-learnings` |
| `IMP` | `sw-change-impact` |
| `SF` | `sw-storefront` |
| `ADM` | `sw-admin-js` |
| `PRD` | `sw-pr-description` |
| `PRR` | `sw-pr-review` |
| `DEV` | `sw-podman-dev` |
| `XR` | `sw-extension-review` (WP6) |

We use our own prefixes rather than core's (`MIG`, `BCPHP` and so on). Core
IDs are recorded in a separate field because core may renumber or retire them.

### Inline marker in skill Markdown

The rule bullet starts with the bold ID:

```markdown
- **TEST-014** Never add listeners to the shared `event_dispatcher` in a test. ...
```

Models read the ID as plain text. It costs about three tokens per rule.

### Catalog file: `rules/catalog.json`

It sits outside `skills/`, so `npx skills add` installs do not ship it.

```json
{
  "$schema": "./catalog.schema.json",
  "rules": [
    {
      "id": "TEST-014",
      "skill": "sw-testing",
      "file": "skills/sw-testing/references/test-shape-and-flags.md",
      "title": "Observe events through a hook or an owned dispatcher",
      "status": "active",
      "since": "2026-10-20",
      "eval": "event-hook-capture-then-assert",
      "trunk": {
        "source": "coding-guidelines/core/unit-tests.md#observing-events-in-tests",
        "commit": "f2bf3794",
        "enforced_by": ["PHPStan NoAssertionInEventHookRule", "PHPStan NoRuntimeListenerOnSharedEventDispatcherRule"]
      },
      "core_guide_ids": [],
      "audience": ["core", "plugin"],
      "defer_on_trunk": true
    }
  ]
}
```

Field rules:

- `status` is `active`, `retired` or `superseded:<ID>`.
- `eval` is a task name under `evals/tasks/`, or `null` together with
  `"eval_reason"` for documented-only rules. The old `defer-on-trunk` rows in
  the alignment doc become `defer_on_trunk: true` with `eval: null`.
- `enforced_by` names the CI tool that already catches the rule. WP3 uses it.
- `audience` is any of `core`, `plugin`, `app`, `storefront`, `admin`. WP6 uses it.

### Validator: `tools/bin/validate-rules.ts`

It is called from `validate-skills.sh` and fails when:

1. An inline `**PREFIX-NNN**` in `skills/**.md` has no catalog entry, or the reverse.
2. An ID is duplicated, or its prefix does not match the owning skill.
3. The `file` in an entry does not contain the inline marker.
4. The `eval` task does not exist, or an `active` rule has neither `eval` nor `eval_reason`.
5. A retired ID still appears inline.

It also prints coverage: active rules, rules with an eval, and rules that are
documented only.

### Migration of existing rules

- `tools/bin/rules-bootstrap.ts` is a one-off. It walks the alignment doc
  tables and the `Definition of done` lists, proposes IDs, and writes a draft
  catalog for human review.
- Roll it out one skill at a time, starting with `sw-testing`, which
  has the most mapped rules.
- The alignment doc tables gain an `ID` column. Later they can be generated
  from the catalog with `tools/bin/render-alignment.ts`.

### WP2 acceptance

- At least `sw-testing`, `sw-plugin-development` and
  `sw-review-learnings` are fully tagged.
- The rule validator runs in `validate.yml`, with unit tests for every error.
- The README and `AGENTS.md` "Adding or changing a rule" steps mention the ID and the catalog.

---

## WP3: "Do not flag" sections

Goal: stop agents from spending context on what CI already enforces, and
stop review output from repeating CI.

Status: **done 2026-10-20**. `tools/bin/render-enforced.ts` writes the
section into the four skills of the acceptance plus `sw-review-learnings`,
from 25 checks read in trunk source at 1283747 (PHPStan, Danger, ESLint,
PHP-CS-Fixer, PHPUnit runtime and devops tests). `sw-core-development`
and `sw-admin-js` were tagged for this (62 and 38 rules). Changes from
the spec:

- `enforced_by` entries are objects (`tool`, `kind`, `catches`, `misses`,
  `trunk_only`), so the bullet text comes from data, not from a tool name.
- `trunk_only` means "not active in a plugin or app project by default".
  Shopware's opt-in PHPStan rules (`rules.neon`) count as trunk only,
  because their default namespaces are `Shopware\Tests\...`.
- Above ten checks the list moves to a generated
  `references/enforced-by-ci.md` and `SKILL.md` keeps a pointer
  (`sw-testing` has 14).
- The validator reports drift instead of a separate check script.

No CI check exists for named `yield` providers, `#[CoversNothing]` tests in
`tests/unit/`, repository versus `Connection`, Symfony `Filesystem` (only
`file_exists()`), or any Admin rule except deprecated `sw-*` components.
Those rules keep needing a reviewer.

### WP3 spec

- Each skill with review or checklist content gets a final section
  `## Already enforced by CI (do not repeat)`, with at most ten bullets.
- Generate the section from catalog entries with a non-empty `enforced_by`,
  using `tools/bin/render-enforced.ts`. The validator checks that the rendered
  block between `<!-- enforced:start -->` and `<!-- enforced:end -->` matches
  the catalog.
- Each bullet names the tool and what it misses, following core's pattern.
  Example: "`NoDropStatementInUpdateRule` catches top-level `DROP` in
  `update()`. It misses drops inside `if`, `sprintf` SQL and renames; flag those."
- Plugin context: the PHPStan rules only run inside the Shopware repo. For
  plugin audiences, the section says that the rule is enforced on trunk only
  and that plugins still need the check.

### WP3 acceptance

- The section exists in `sw-testing`, `sw-core-development`,
  `sw-plugin-development` and `sw-admin-js`.
- The `SKILL.md` line budget still holds, so move long lists to references.

---

## WP4: Path-based reference routing

Status: **done 2026-10-20**, token check included. The check kept the
current runner (commit `7cda4e3`) and swapped only `skills/` back to
`ad0723a`, the commit before #20, because that commit has no token logging:

```bash
git checkout ad0723a -- skills && EVAL_RESULTS=/tmp/before.jsonl bash scripts/eval-local.sh
git checkout HEAD -- skills && EVAL_RESULTS=/tmp/after.jsonl bash scripts/eval-local.sh
bash scripts/eval-diff.sh /tmp/before.jsonl /tmp/after.jsonl
```

Both runs: `prepare-plugin-for-6-8`, Claude Haiku, `REPEATS=3`. Average
tokens per skill-on run:

| Skills | Input | Output | Pass |
| ------ | ----- | ------ | ---- |
| before routing (`ad0723a`) | 106,578 | 2,429 | 3/3 |
| after routing and `on_demand` | 107,844 | 2,629 | 3/3 |

Total tokens rose 1.3 %, inside the noise: the skill-off runs, which load
no skills in either case, averaged 230,640 and 100,405 input tokens. So
the larger tables cost no measurable tokens, and the task does not show a
saving either. Pass rate and skill loading are unchanged. The task mostly
touches `sw-plugin-development`, so it says little about the
references that moved to `on_demand`.

All 14 skills with references have a `routes.json`, not only the
five largest. Changes from the spec below:

- Each route also has `when`, the task in words. The generated table has the
  columns "Read | When | Or the change touches" and replaces the prose list
  of references, so `SKILL.md` does not grow.
- Anchors match changed lines in every file, test files included, because
  `sw-testing` routes on test code.
- Globs use Node's `path.matchesGlob`, not minimatch, so the tools keep zero
  runtime dependencies.
- `validate-routes.ts` also fails when a reference has no route. The
  generated `enforced-by-ci.md` is exempt.
- Three references are `always: true`: the single procedure reference of
  `sw-change-impact`, `sw-pr-description` and `sw-pr-review`.

Follow-up on 2026-10-20, after review of PR #20:

- **`on_demand` routes.** Some references depend on the task, not the diff.
  A route with `on_demand: true` has a `when` and no triggers, shows
  "on demand" in the table, and the router never selects it. The validator
  allows exactly one of triggers, `always` or `on_demand`, so every
  reference is still routed. `when-stuck.md` and `docs-map.md` used proxy
  triggers (`@phpstan-ignore`, a docs URL) that fired on unrelated changes,
  and `change-scope.md` was `always`. All three are `on_demand` now.
- **Separate report.** `route.ts` prints `selected`, `always` and
  `on_demand` apart. `expected.json` in the routing cases lists only what
  the diff selected, so the cases no longer pass on routes that fire
  everywhere.
- **Shorter tables.** The trigger column shows at most two globs and one
  regex, then "…". `routes.json` keeps the full lists. The tables went from
  12.3k to 10.5k characters across all skills.
- **Dropped proxy.** The `StaticSystemConfigService` anchor on
  `external-inspiration.md` is gone; the reference does not mention it.

Goal: load only the reference that matches the files being changed, instead
of relying on the model to pick from prose.

### Route file: `skills/<skill>/routes.json`

Same idea as core's `guides/index.json`, scoped to one skill:

```json
{
  "$comment": "Proposes references for a diff. The table in SKILL.md is generated from this file.",
  "routes": [
    {
      "reference": "references/migrations.md",
      "paths_any": ["**/Migration/Migration*.php"],
      "anchors_any": ["extends MigrationStep", "updateDestructive\\("],
      "always": false
    },
    {
      "reference": "references/cache-tags.md",
      "paths_any": ["**/*CachedRoute*.php", "**/Resources/config/packages/*cache*"],
      "anchors_any": ["CacheTagCollector", "addCacheTag\\(", "#\\[HttpCache"]
    }
  ]
}
```

Matching uses `paths_any` globs (minimatch semantics) or `anchors_any`
regexes on added and removed lines of non-test files. Any hit selects the
reference.

### Rendered table in SKILL.md

Between `<!-- routes:start -->` and `<!-- routes:end -->`:

```markdown
| If the change touches | Read |
| --------------------- | ---- |
| `Migration*.php`, `extends MigrationStep` | [migrations](references/migrations.md) |
```

`tools/bin/render-routes.ts` generates the table. `validate-skills.sh` fails
when it is out of sync or when a route points to a missing reference.

### Routing tests: `evals/routing/<case>/`

```text
evals/routing/plugin-migration-and-cache/
  diff.patch       # a real or trimmed diff
  expected.json    # {"sw-plugin-development": ["references/migrations.md", "references/cache-tags.md"]}
```

- `tools/bin/route.ts <diff>` prints the selected references per skill.
- `tools/test/route.test.ts` runs every case with `node --test`.
  It is free and runs on every push.
- Start with eight cases: plugin migration, Store API route, storefront Twig,
  Admin component, app manifest, unit test, integration test, release notes.

### WP4 acceptance

- `routes.json` exists for the five largest skills.
- The routing tests run in `validate.yml`.
- In the WP1 runs, average transcript tokens for behavioral tasks do not go up.

---

## WP5: Review-shaped evals

Status: **done 2026-10-21**. Ten pairs, more than the six planned:
`review-event-hook-assert-*` (TEST-016), `review-store-api-contract-*`
(PLG-027), `review-migration-customized-data-*` (PLG-028),
`review-reset-interface-*` (ARCH-001), `review-queue-inline-fallback-*`
(REV-033) and `review-twig-block-removed-*` (SF-001), plus four from WP7
phase A: `review-migration-unbatched-backfill-*` (PLG-019),
`review-migration-feature-flag-*` (PLG-029),
`review-migration-narrowing-update-*` (PLG-030) and
`review-test-cannot-fail-*` (TEST-035). All golden transcripts pass
`test-graders.sh`; `eval-plan` picks up every task with a `grade.sh`, so the
`-ignore` tasks run in the WP1 A/B.

Goal: grade review skills on whether they find a planted problem and stay
quiet on a clean diff. Today the review skills have one or two tasks each,
and all graders check edits.

### Task layout

```text
evals/tasks/review-<rule-slug>-catch/
  instruction.md            # "Review diff.patch. Output findings as one fenced json block."
  fixture/diff.patch        # the diff with the planted problem
  fixture/context/          # optional: files the reviewer may open
  fixtures/pass/.transcript.txt   # golden transcript with the right finding
  fixtures/fail/.transcript.txt   # sneak: finding at the right file with the wrong rule, or severity "nit"
  grade.sh
  skills                    # the skills under test
  .skip-fixture-grade
evals/tasks/review-<rule-slug>-ignore/   # a clean diff that looks similar; the grader fails on a finding with that ID prefix
```

### Findings output contract

The instruction asks for this shape. WP6 makes it the skill's default output.

```json
{
  "findings": [
    {
      "rule_id": "PLG-021",
      "severity": "blocking|major|minor|nit",
      "file": "src/Migration/Migration1729000000UpdateMailTemplate.php",
      "line": 42,
      "summary": "Updates mail_template without an updated_at IS NULL guard.",
      "fix": "Add WHERE updated_at IS NULL, or skip templates the merchant edited."
    }
  ]
}
```

### Grader helpers in `evals/grade-helpers.sh`

Deviation: the grader is `tools/bin/grade-findings.ts` (TypeScript, no `jq`),
in line with WP10. A task's `grade.sh` execs it with `catch` or `ignore`.
The pristine `fixture/` has no transcript and fails both modes, so
`.skip-fixture-grade` is not needed. The design below still describes the
checks.

- `grade_findings_json`: extracts the last fenced `json` block from
  `$TRANSCRIPT`. Exit 1 when it is missing or invalid.
- `grade_has_finding <id-prefix> <file-glob> <min-severity>`: uses `jq` to find
  a finding whose `rule_id` starts with the prefix, whose `file` matches, and
  whose severity is at least the minimum.
- `grade_no_finding <id-prefix>`: used by `-ignore` tasks.
- The `-catch` grader also accepts a finding without `rule_id` when its
  `summary` matches a per-task keyword regex. This keeps the eval fair when the
  skill is off and the model cannot know our IDs. A/B then compares
  detection, not ID recall.

### First batch

| Task | Planted problem | Owner |
| ---- | --------------- | ----- |
| `review-migration-customized-data-catch` / `-ignore` | mail template update without `updated_at IS NULL` | `sw-plugin-development` |
| `review-store-api-contract-catch` / `-ignore` | field type or nullability change on an existing route | `sw-plugin-development` |
| `review-reset-interface-catch` / `-ignore` | memoized property without `ResetInterface` | `sw-architecture` |
| `review-queue-inline-fallback-catch` / `-ignore` | handler falls back to synchronous work when the queue is missing | `sw-review-learnings` |
| `review-twig-block-removed-catch` / `-ignore` | storefront Twig block renamed without deprecation | `sw-storefront` |
| `review-event-hook-assert-catch` / `-ignore` | assertion inside an event hook closure | `sw-testing` |

Core's 31 fixtures in `.agents/skills/sw-review/tests/eval.yaml` are MIT
diffs. Reuse only their scenario ideas and write our own diffs, per the
"do not copy upstream" rule in `AGENTS.md`.

### WP5 acceptance

- Six catch and ignore pairs exist, and their golden transcripts pass
  `test-graders.sh`.
- `-ignore` fixtures are included in the WP1 A/B. False positives count as
  failures.

---

## WP6: `sw-extension-review` skill

Status: **built 2026-10-21; acceptance needs the model runs.** The skill
defines no rule, so the `XR` prefix stays unused. Its `routes.json` borrows
24 references of eight skills (`../<skill>/references/<file>.md`; the
triggers come from the owning skill's route) and sets `audience: ["plugin",
"app"]`. `validate-rules` fails when a borrowed reference holds an active
rule for neither audience that `references/lenses.md` does not name, so a
new core-only rule cannot slip into extension reviews. `impact-review.md`
and the admin `flags-and-modern-web.md` are not borrowed: the first is the
hand-off, the second is almost all core-only. Every `review-*-catch` and
`-ignore` task now loads the skill next to the owning one.

A/B on 2026-10-21 (claude, haiku, 3 repeats): all six catch tasks and the
ignore tasks pass with the skill on and off, so the second acceptance
point is not met: Haiku finds the planted problems without help. A real
review of a plugin with the skill (29 findings) had no false finding, but
only 3 of 12 cited rule IDs fit. The skill's weak point is the rule ID,
not detection. `output.md` now says when to cite an ID, `lenses.md` lists
the near misses, and four `review-<topic>-near-miss` tasks fail a review
that cites the decoy rule. Next: catch tasks subtle enough that the
model misses them without the skill.

Goal: a review skill for plugin and app diffs. Core's `sw-review` only
reviews `shopware/shopware` PRs, and our `sw-pr-review` only answers
review threads.

### Scope

- **Triggers**: "review my plugin PR", "review this diff" inside
  `custom/plugins` or `custom/apps`, "is this plugin safe to release",
  "check this before the Store submission".
- **Stays quiet for**: core PRs, where `sw-review` owns review on trunk;
  replying to review threads, which `sw-pr-review` owns; writing code.
- **REGISTRY topic**: "Reviewing plugin and app diffs as a whole: route
  rules by changed paths, rule-tagged findings". It owns the workflow only.
  Each rule stays owned by its topic skill.

### Skill layout

```text
skills/sw-extension-review/
  SKILL.md                 # workflow, output contract, severity scale, < 150 lines
  routes.json              # WP4 format, pointing to OTHER skills' references
  references/lenses.md     # BC for extenders, cache, migrations, queue, security, tests
  references/output.md     # findings JSON + Markdown rendering
  evals/should-trigger.md
  evals/should-not-trigger.md
```

### Workflow in SKILL.md

1. Collect the diff with `git diff <base>...HEAD`, or with `gh pr diff` for a PR.
2. Classify the changed paths by surface: plugin PHP, migration, Store API,
   storefront, admin, app manifest, tests.
3. Select references with `routes.json`. Always read the backward-compatibility
   and cache lenses for any PHP or storefront change.
4. Check each selected rule. Report only rules with `audience` covering
   `plugin` or `app`.
5. Output findings in the WP5 contract. Each finding names a rule ID and the
   concrete failure on a real shop.
6. Add a "Do not flag" pass: drop findings that ECS, PHPStan or
   `shopware-cli extension validate` would already report.
7. Hand off: feature blast radius goes to `sw-change-impact`, and Store
   compliance goes to the `shopware-cli-extension-store` skill when it is installed.

### Severity scale

Aligned with core's maintainer persona:

| Severity | Meaning |
| -------- | ------- |
| blocking | Data loss, security hole, removal without deprecation in a released extension API |
| major | Breaks shops behind HTTP cache, workers, or other extensions; merchant edits overwritten |
| minor | Correct but costly or fragile |
| nit | Style; only when asked |

### Dependency

The skill's value depends on WP7 rules existing. Ship it after at least the
WP7 phase A rules.

### WP6 acceptance

- Activation evals reach 90 % or more on should-trigger and 0 false triggers
  for core PR review prompts.
- In the WP1 A/B, `on` beats `off` on at least four review catch tasks for
  plugin and app rules, and false positives on `-ignore` tasks do not
  increase. (Changed 2026-10-21 from "four of the six WP5 catch tasks":
  Haiku finds those six without the skill, so they cannot show it helping.)

---

## WP7: Rule backlog from the core guides

Status: **phase A done 2026-10-21**, together with WP5. Each phase A rule
got a review pair instead of the behavioral or AST task named in the table:
a pair tests detection and false positives in one go, and the graders are
shared. Behavioral tasks can follow where A/B shows the review pair is not
enough. The same PR tagged `sw-architecture` (ARCH-001..004) and
`sw-storefront` (SF-001..010); their existing storefront tasks now
back SF-002..010.

Phases B and C done 2026-10-21. Phase B: PLG-031, SEC-007, SF-011..013,
IMP-008, ADM-039, ADM-040, ARCH-005 and CORE-063, each with a review pair
(ten pairs). Phase C: CORE-064..077 in four new core references
(`removals-and-shims.md`, `bc-data-and-config.md`, `platform-scope.md`,
`asset-lifetime.md`), `audience: ["core"]`, no eval. Core guide IDs that an
existing rule already states were mapped onto it in `core_guide_ids`
instead of becoming a second rule (DOCS-*, REMOVAL-001/003, SCOPE-001/003/006,
BCPHP-001, MIG-001/003/005, ADMF-*, BCADM-006/009). `defer_on_trunk` is true
only where the rule's source is on trunk; the SCOPE rules cite the guides of the
open core PR #21455 and stay false. The IDs were checked against #21455 at
`1e641ecf`, and again on 2026-10-23 at the final head `d97c7fbb`: the same
111 IDs, all 77 we map still exist. Two mapped rules were reworded after
`1e641ecf`. MIG-002 (`PLG-030`) only adds a core CI hint, the nightly
blue-green lane, so nothing changes for plugins. TEST-002 (`TEST-035`) now
also flags an existing test expectation changed in the same PR as the code
under test, unless the PR announces the behavior change. `TEST-035` does not
cover that half yet; it is a candidate for a new `sw-testing` rule with a
review pair. Core's guides reuse our `TEST` prefix (TEST-001..010 mean
different rules there), so a core ID appears only in `core_guide_ids` and
never bare in skill text. When #21455 merges, the SCOPE rules (`CORE-030`,
`CORE-072..074`, `IMP-003`) and `REV-033` defer on trunk, with the guide as
`trunk.source`. `sw-security` (SEC-001..007) and `sw-change-impact`
(IMP-001..008) are now tagged as well.

Goal: adopt the core review-guide rules that matter for plugin and app
developers, in our own words, each with an eval.

Each rule follows the existing process: REGISTRY owner, rule text, catalog
ID, behavioral or review eval, and a golden fail fixture.

### Phase A: no dependency on #21541

| New ID | Rule | Owner | Core ref | Eval |
| ------ | ---- | ----- | -------- | ---- |
| PLG-xxx | Data migrations on mail templates, flows, CMS or config skip rows the merchant edited (`updated_at IS NULL` or a comparable guard) | `sw-plugin-development` | MIG-006 | `review-migration-customized-data-*` and behavioral `migration-respects-customized-data` |
| PLG-xxx | Batch large data migrations about 1,000 rows at a time with a deterministic `ORDER BY` and a cursor; use an indexer for derived data | same | MIG-004, MIG-005 | `migration-batched-backfill` |
| PLG-xxx | No `Feature::isActive()` in migrations | same | MIG-008 | `migration-no-feature-flag` (AST) |
| PLG-xxx | `update()` must not narrow types, add `NOT NULL` without a default, or drop defaults; those go to `updateDestructive()` | same | MIG-002 | extend existing migration tasks |
| ARCH-xxx | Services that memoize in a property implement `ResetInterface` or carry the `kernel.reset` tag | `sw-architecture` | DIX-005 | `memoized-service-resets` (AST) |
| REV-xxx | Message handlers have no inline synchronous fallback; subscribers do no heavy work and dispatch a message instead. This replaces the TODO in `dal-and-performance.md` | `sw-review-learnings` | QUEUE-001, QUEUE-003 | `review-queue-inline-fallback-*` |
| TEST-xxx | Tests that cannot fail: a captured value that is never asserted non-null, or a mocked transaction that never runs its closure | `sw-testing` | TEST-002 | `test-asserts-hook-fired` |

### Phase B: links to the #21541 guidelines (merged 2026-10-19)

| New ID | Rule | Owner | Core ref |
| ------ | ---- | ----- | -------- |
| PLG-xxx | Store API contract: no field type, nullability or shape change, no new required parameter, no status code change, no stricter validation on an existing route | `sw-plugin-development` → `api-contracts.md` | BCAPI-001, -002, -008 |
| SEC-xxx | Do not change `_routeScope`, `_loginRequired`, `_httpCache` or `_acl` on an existing route without a deprecation | `sw-security` | BCAPI-006 |
| SF-xxx | Twig blocks, template variables and template files are public API for themes: deprecate before you rename, move or remove them | `sw-storefront` | BCSF-001..004 |
| SF-xxx | JS plugin names, public methods, events and options are public API; phase helpers out instead of deleting them | `sw-storefront` | BCSF-005..007 |
| SF-xxx | SCSS variables, `is--*` state classes, `theme.json` fields and snippet keys are public API | `sw-storefront` | BCSF-008 |
| SF-xxx | Change caching through cache policies; never disable caching for logged-in customers; keep personal data off cacheable responses | `sw-storefront` | CACHE-005 |
| IMP-xxx | A cache key holds every input (Criteria, app state), with few tags | `sw-change-impact` | CACHE-006 |
| ADM-xxx | Component props, required props, Twig blocks, methods, computed and data, and `swDefinePublic` keys are public API | `sw-admin-js` | BCADM-001..005 |
| ADM-xxx | `blocks-list.json` and position identifiers are a contract | `sw-admin-js` | ADMF-008 |
| ARCH-xxx | Extension event properties are the contract; do not pass the whole `Request` in payloads | `sw-architecture` | BCEXT-005, -006 |
| CORE-xxx | Replacements for a deprecated API must be usable today, not `@internal`, experimental or flag-only | `sw-core-development` | BCPHP-004 |

### Phase C: core-only, defer on trunk

Add these as catalog entries with `audience: ["core"]` and
`defer_on_trunk: true`. No eval is needed beyond the existing ones:
REMOVAL-001..004, SCOPE-001/002/004/005, BCDATA-*, DOCS-003..008, and
CACHE-001..003 for theme asset lifetime.

### Budget rule

Keep at most ten rules per reference file, following core's guides. When a
reference grows past that, split it by angle, the way core splits
`migrations` from `bc-data-and-config`.

### WP7 acceptance

- Phase A is merged with evals, and each new task has a `fixtures/fail/` near-miss.
- The WP1 A/B shows `improved` or `held` with on = repeats for every new task.
  Rules that show "no difference" twice in a row go to review for removal.

---

## WP8: Automated trunk mining

Status: **done 2026-10-21**. Run on 2026-10-13..2026-10-19, the script
reports eight commits with a delta: the five found by hand, #21541 (the new
guidelines, handled in WP0), and two the hand pass skipped. #21660 adds
`DeprecatedEntityConstructionRule`, which no rule maps. #21177 changes
`BCChangeAttributeUsageRule`, which CORE-015 cites. The other four commits in
the window are listed as having no delta. The state starts at the trunk head
of 2026-10-19 (`21949101`), where the last hand pass ended. Differences from
the spec:

- The script calls the GitHub REST API with `fetch` (`tools/src/github.ts`)
  instead of `gh api`. GH_TOKEN or GITHUB_TOKEN raises the rate limit.
- The report has three more sections: agent skill bullets, PR template lines,
  and the list of commits. A change to a rule class counts only when
  `enforced_by` cites it, so small fixes to other rule classes stay quiet.
- An issue whose window a newer report also covers is closed as superseded.
- The `/mined` PR needs "Allow GitHub Actions to create and approve pull
  requests". GitHub does not start CI for a PR opened with GITHUB_TOKEN; the
  PR changes only `docs/.mining-state.json`.

Goal: replace the manual mining pass with a weekly issue that lists new
deltas.

### Script: `tools/bin/mine-trunk.ts`

- **State**: `docs/.mining-state.json` holds
  `{"last_sha": "<trunk sha>", "last_date": "2026-10-19"}`.
- **Inputs**: trunk commits since `last_sha` that touch `.agents/`,
  `coding-guidelines/`, `src/Core/DevOps/StaticAnalyze/` or
  `.github/PULL_REQUEST_TEMPLATE.md`, using `gh api repos/shopware/shopware/commits?path=...`.
- **For each commit it extracts**:
  - added or removed bullets in `.agents/skills/**/SKILL.md`
  - new headings in `coding-guidelines/**`
  - new PHPStan or Danger rule classes
  - rule IDs added to or retired from `sw-review/guides/*.md` frontmatter,
    once #21455 merges
- **Cross-check against `rules/catalog.json`**:
  - A core guide ID with no `core_guide_ids` match is **unmapped**.
  - A PHPStan or Danger class with no `enforced_by` match is **unmapped**.
- **Output**: Markdown with three sections: unmapped core IDs, new
  enforcement, and changed guideline headings.

### Workflow: `.github/workflows/mine-trunk.yml`

- Runs weekly on Monday at 05:00 UTC, before `evals.yml`, plus manual dispatch.
- Runs the script and opens or updates an issue labeled `trunk-drift`, with
  one issue per week.
- Updates `.mining-state.json` only after a human closes the issue, through a
  `/mined` comment or a small follow-up PR. The state must not advance on
  unread deltas.
- No model calls and no secrets beyond `GITHUB_TOKEN`.

### WP8 acceptance

- Run against the window 2026-10-13..2026-10-19, it reports the five commits
  found by hand: f2bf3794, 75b0a495, 190d734b, 8dc74f24, 7ad011f1.
- The type check and unit tests in `tools/` pass; the GitHub API is stubbed in tests.

---

## WP9: Upstream watchlist

Status: **table done 2026-10-20** in
[`core-pr-17657-alignment.md`](../core-pr-17657-alignment.md#watchlist).
Changes since this plan was written: #21541 merged on 2026-10-19, so WP7
phase B is unblocked. #21722 was closed; its Administration agent docs are
now part of #21730, and #21725 is the lint-baseline PR #21730 builds on.
Prepared branches: draft PR #23 for #21627 and draft PR #24 for #21730
(BrocksiNet/ai-skills-shopware). The weekly update waits for WP8.

Goal: prepare for open core PRs before they merge.

Add a `## Watchlist` table to `docs/core-pr-17657-alignment.md`, updated by
WP8 using `gh pr view --json state,mergedAt`:

| PR | Topic | Our impact | Prepared branch |
| -- | ----- | ---------- | --------------- |
| #21455 | `sw-review` topic guides with rule IDs | WP2 `core_guide_ids`, WP7 | none yet |
| #21541 | BC and HTTP-cache guidelines | WP7 phase B links | none yet |
| #21627 | PR template: What and why / How / Testing / Additional notes / Checklist | rewrite `sw-pr-description/references/pr-body-template.md` and the `pr-no-ai-trailers` fixtures | prepare now |
| #21730 | Admin lint: no `.js` in `src`, no new mixins, `wrapComponentConfig()` required | WP0 #7, `admin-js-implementation-to-ts` grader | prepare now |
| #21722 | Admin reference implementations named in AGENTS.md | point `sw-admin-js` to the named component, composable and store | after merge |
| #21502 | `composer skills:enable` / `skills:disable` | `docs/skill-resolution.md`: the official way to hide core skills when using the full install | after merge |

### WP9 acceptance

- The table exists. WP8 flips a row to merged and opens a `trunk-drift` item
  in the same week.

---

## WP10: Eval runner in TypeScript

Status: **steps 1 and 2 done 2026-10-20, steps 3 to 7 done 2026-10-21**.

- Step 1: plan, gate and diff live in `tools/src/eval-{plan,gate,diff}.ts`
  over the typed records in `tools/src/eval-results.ts`. On the WP1 and WP4
  result files and a set of edge cases they print the same output and exit
  codes as the bash versions. A non-numeric `EVAL_GATE_*` setting is now a
  usage error instead of a crash halfway through the summary.
- Step 2: `tools/src/run-task.ts` and `tools/src/ab.ts`. In 34 side-by-side
  runs with the fake agent (every verdict, retries, partial errors, skill
  loads, tokens, usage errors) the JSONL, stdout, stderr and exit codes match
  the bash runner. New: `EVAL_AGENT_TIMEOUT_SECONDS` kills the agent's process
  group, and a background child holding the agent's output no longer blocks
  grading. That is what step 3 needs to drop the watchdog in
  `opencode-task.sh`.
- Step 3: the four agent adapters live in `tools/src/agents.ts`, the event
  parsers in `tools/src/agent-events.ts` and the profile in
  `tools/src/skills-profile.ts`. The parsers are tested on one recorded
  OpenCode session and one recorded Claude Code session
  (`tools/test/fixtures/agents/`, scrubbed of paths and IDs). In 41
  side-by-side runs against fake CLIs the stdout, stderr, exit codes and
  skill and token logs match the bash adapters. The OpenCode watchdog is
  gone: `tools/src/proc.ts` kills the process group on timeout, and the
  adapters no longer need `python3`. No Codex or Cursor adapter was added,
  because `evals/smoke/` still covers those agents.
- Step 4: activation evals in `tools/src/activation.ts` and the local run in
  `tools/src/eval-local.ts`. On all 265 activation prompts, dry and with a
  fake activation command, the output and exit code match the bash script.
  The A/B command line moved into `runAb` (`tools/src/ab-run.ts`) so that
  `eval-local` calls it directly. `evals/runner/selftest.sh` is gone: its
  cases are unit tests, and `tools/test/runner-cli.test.ts` covers the
  command-line layer and checks that every wrapper reaches its bin. Two
  behaviour changes, both stricter:
  - A skill counts as activated only when the output names it as a whole
    entry; `grep -w` also matched it inside a longer name.
  - When `eval-local` produced no results file, the gate reports "no results"
    (exit 1) instead of a read error (exit 2).

- Step 5: skill validation in `tools/src/validate-skills.ts`, with the
  per-skill and conflict checks as pure functions in
  `tools/src/skill-checks.ts`. The rule ID and route checks run in the same
  process (`tools/src/check-reports.ts`); their own bins stay. On the
  repository and on a copy with one planted error of every kind, the output
  and exit code match the bash script, apart from a trailing space after the
  owners of an overlapping trigger phrase. Two behaviour changes, both on
  inputs the repository does not have:
  - A folded description is measured without the leading space the bash
    version added, so the 1024 budget counts the text a provider loads.
  - Any top-level frontmatter key ends a folded description, also one with
    no value on its line (`metadata:`), which the bash version appended.

- Step 6 (added to close the acceptance list): `evals/test-graders.sh`,
  `evals/runner/fake-agent.sh` and `scripts/check-update.sh` now call
  `tools/bin/test-graders.ts`, `fake-agent.ts` and `check-update.ts`. The
  golden grader output and exit codes match on all 64 tasks. The fake agent
  matches the bash version in all 2,268 combinations of skills present,
  mode, load, usage, one-shot fault and task (stdout, stderr, exit code,
  resulting workdir, skill and token logs). `check-update` asks the GitHub
  API with `fetch` instead of trying `gh` and then `curl`.

- Step 7 (added 2026-10-21): the task graders. Each of the 98 non-AST
  tasks has its checks in `tools/graders/<task>.ts`; its `grade.sh` is one
  shared wrapper that runs `tools/bin/grade.ts <task>`, so Harbor, the smoke
  harness and the runner did not change. The kit in `tools/src/grade/`
  replaces `evals/grade-helpers.sh` (file search, per-line matching like
  `grep -q`, comment stripping, one PHP method, one JS call) and
  `tools/bin/grade-findings.ts` (`reviewCatch`, `reviewIgnore`). Every golden
  case passes as before. The port found two shell checks that could never
  match, now fixed:
  - `mwg-only-after-shopware-primitive` tested the folder name on the file
    name, so an added modern-web-guidance skill never failed the task.
  - `no-access-key-in-source` read `$_ENV` as an end-of-line anchor, so a
    key read from `$_ENV` did not count.
  File search skips `node_modules` and `.git` and takes the first match in
  sorted order. The six AST graders stay JavaScript in `evals/tools/ast/`,
  because they need `php-parser` and `@babel/parser`.

Every `scripts/*.sh` file, every `evals/runner/*.sh` file except
`install-agent.sh`, and every `grade.sh` is now a wrapper. The shell left is
`install-agent.sh` (it runs the vendors' shell installers on CI) and
`evals/smoke/`, which is retired rather than ported once `eval-local` covers
its agents.

Goal: one typed codebase for the eval pipeline, so result records, verdicts
and gate rules are checked by the compiler instead of by `jq` filters and
inline Python.

### Repo tooling (TypeScript)

Since 2026-10-20 the repo tooling lives in `tools/`: TypeScript run directly
by Node 24 (built-in type stripping, no build step), `tsc --noEmit` with
`strict`, and `node --test`. CI runs it in the `tools` job of `validate.yml`.
New tooling goes there; the WP2 validator was the first port. Shell stays
only for thin wrappers where a tool must be called from a shell step,
`grade.sh` among them: the grader contract is a script that exits 0 or 1.

### WP10 spec

Port these to `tools/`, one PR each, keeping CLI names, environment
variables and the JSONL format so `evals.yml` and baselines keep working:

1. `scripts/eval-plan.sh`, `eval-gate.sh`, `eval-diff.sh`: pure functions
   over typed `AbResult` records, with the selftest cases as unit tests.
2. `evals/runner/ab.sh` and `run-task.sh`: fixture copy, skills profile,
   retries and verdicts. `child_process` with a timeout replaces the
   portable watchdog.
3. Agent adapters (`opencode-task.sh`, `claude-task.sh`,
   `opencode-activation.sh`) and `skills-profile.sh`: event-stream parsing
   moves from inline Python into typed parsers with recorded fixtures.
4. `scripts/run-activation-evals.sh` and `scripts/eval-local.sh`.
5. `scripts/validate-skills.sh`, last, once nothing else needs bash.

`evals/smoke/` is not ported; it is retired once `eval-local` covers its
agents (Codex and Cursor adapters are added in step 3 if still used).

### WP10 acceptance

- `evals/runner/selftest.sh` is replaced by unit tests in `tools/` that cover
  the same cases, plus parser tests on recorded agent output. **Met** in
  step 4.
- A local `eval-local` run and a CI `evals.yml` run produce the same JSONL
  fields as before, and the gate gives the same verdict on the WP1 baseline.
  **Met locally:** on the WP1 run (`local-20261020T125814Z.jsonl`) the
  ported gate prints the same summary and exit code as the bash gate from
  before step 1. The JSONL fields were compared side by side in step 2. The
  next `evals.yml` run confirms it on CI.
- Only `grade.sh` files and documented wrappers remain as shell scripts.
  **Met** in step 6, with the exceptions listed above.

---

## WP11: Public API index

Status: **accepted 2026-10-22; phases 0 to 3 done, phase 4 next.** Plan:
[`2026-10-wp11-public-api-index.md`](2026-10-wp11-public-api-index.md).

Goal: give agents facts about Shopware's public API per release, built
from the public `shopware/shopware` repository: PHP classes and methods,
Store and Admin API routes, entity fields, admin and storefront extension
points, feature flags and configuration, each with its `@internal`,
`@deprecated` and `@final` status. Two optional tools use it: `api-facts`
checks an extension against its supported range, and `api-diff` reports
public API a pull request breaks beyond what core's `bc-check` sees.

This replaces the Kev classifier experiment first planned here. The same
model was already measured for triage in shopware/framework-team#120; the
facts, not the model, were the bottleneck there, and the routing question
it would answer has no recorded ground truth.

---

## WP12: Skill update automation

Status: **accepted 2026-10-23; phases 0 to 2 done, phase 3 next.** Plan:
[`2026-10-skill-update-automation.md`](2026-10-skill-update-automation.md).

Goal: turn drift into rule changes with less manual reading. Trunk mining
reads a list of sources and maps each change to the rule it touches. A
daily job collects maintainer review comments from merged core PRs. A local
command with your agent login proposes new, updated and retired rules and
drafts the pull request. The A/B gate and a human merge stay in place.

---

## Risks and mitigations

| Risk | Mitigation |
| ---- | ---------- |
| Model eval cost grows with the task count | `max_tasks` and `tasks` inputs, 3 repeats only on the monthly run, label-triggered PR runs on changed tasks only |
| Rule IDs drift from core IDs after renumbering | Core IDs live only in `core_guide_ids`; ours are stable |
| Generated sections in SKILL.md confuse contributors | Clear start and end markers, and a validator error that names the render command |
| Review evals reward ID recall instead of detection | The keyword fallback in `grade_has_finding`, and `-ignore` twins |
| Copying core guide wording | Rewrite in our words; cite the core rule by ID and link only |
| Plugin rules mention PHPStan rules that plugins do not run | The "enforced on trunk only" wording from WP3 |
| The API index (WP11) becomes a hidden dependency | The tools are optional; CI runs them only on recorded fixtures; each phase has a measured gate |

## Decisions

All three were accepted as recommended on 2026-10-19.

1. **Eval baselines are committed** to `evals/baselines/` through a monthly bot
   PR, not kept as artifacts only (WP1).
2. **`routes.json` ships inside installed skills.** The rendered table in
   `SKILL.md` is the main mechanism; the JSON is small and lets tools route
   without parsing Markdown (WP4).
3. **`sw-extension-review` covers theme-only projects** through the
   storefront lens. The first WP1 A/B run with theme diffs confirms or
   narrows this (WP6).
