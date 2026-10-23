# Changelog

All notable changes to this skills repository are documented here. Release tags
drive version pinning for `skills.sh` installs (`npx skills update`).

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Drift mining reads every repository in `rules/sources.json`: core trunk
  plus `shopwareLabs/ai-coding-tools`, `netresearch/php-modernization-skill`,
  the `shopware/shopware-cli` skills and `FriendsOfShopware/agent-skills`.
  `docs/.mining-state.json` has one entry per source; the old single-source
  shape still reads.
- The weekly drift issue groups each change by the skill and rule it
  touches. A change ties to a rule through the catalog (`core_guide_ids`,
  `enforced_by`, `trunk.source`, the new `upstream` field), then through
  the skills' `routes.json`, then through the source's skill list. What no
  rule covers is listed as unmapped. `--signals` writes the mapped changes as
  JSON Lines for later tooling.
- `PRD-001` and `PRD-008` record their trunk source, the PR template.

## [0.14.0] - 2026-10-23

### Changed

- **Breaking:** every skill name starts with `sw-`. `php-foundation` is
  now `sw-php-foundation`, and `shopware-<topic>` is now `sw-<topic>`.
  Rule IDs, routes and eval tasks keep their names. Remove the old folders
  and install the new names (see `docs/installation.md`). Our
  `sw-admin-js` no longer shares a folder name with core's
  `shopware-admin-js`.
- The README is short and says why to use the library. Installation,
  architecture with diagrams, results and maintenance moved to their own
  pages under `docs/`.

### Added

- `sw-skill-router`: `/sw-skill-router` runs a dependency-free script that
  reads the git diff, a saved diff or planned paths. It detects core,
  plugin, app or project per file, filters by task (build, review, ship,
  answer, run) and lists the skills and references to load, with the file
  or line that triggered each. It also prints the install command for
  missing skills. Its `index.json` is generated from a new `metadata` block
  in every `SKILL.md` and from the routes.
- Routes take `exclude_paths`, with a per-file default: production-code
  references no longer fire on tests, ADRs or release notes, and a
  Storefront file importing Storefront no longer selects the component
  independence rules. A renamed file routes under its old and new path.
  `tests/devops/` selects the core test patterns. New routing case
  `test-suite-move`.
- The router ranks skills and references by how many files matched, names
  the base branch, merge base and commit count, warns on large diffs, and
  says which core trunk skill leads a topic (`defers_to` metadata).
- `REV-034` in `sw-review-learnings`: comments and docblocks describe the
  code, not the history of the change. From shopware/shopware review
  findings on #19917 and #20855. Routed by history words in comment lines,
  with a review catch and ignore pair and the routing case `history-comment`.
- `REV-035`: a visibility check by ID with `searchIds()` misses
  restrictions set on `sales_channel.<entity>.loaded`, such as Dynamic
  Access hiding categories. `->searchIds(` now selects the DAL review
  reference. Review catch and ignore pair included.
- `sw-help`: what every skill is for, grouped by task, with example prompts.
- `validate-skills` checks the skill metadata, that the router index is up
  to date, and that `sw-help` names every skill.

## [0.13.0] - 2026-10-22

### Added

- WP11 phase 3: the API index covers routes (with scope and OpenAPI
  coverage), entity fields and their API flags, feature flags and bundle
  configuration keys (generator `api-index/0.3.0`). Deprecations count
  where core writes them: docblocks, the entity class, plain and YAML
  comments, handler triggers and feature-flag branches.
- `api-diff` reports what a change does to those surfaces: removed or
  changed without a deprecation, removed after one, and newly deprecated.
  It works on a `shopware/shopware` clone or offline from the index.
  `bc-data-and-config.md` and `impact-review.md` point at it.
- `check-breaks` measures `api-diff` against the breaks the 6.6, 6.7 and
  6.8 UPGRADE files name: 97.2 % recall, 97.1 % precision. The weekly
  index workflow runs it.
- WP11 phase 4: the API index covers the admin and the storefront
  (generator `api-index/0.4.0`). Admin: components with their props,
  methods, emits, slots and template blocks, position identifiers and the
  `Shopware` global, `@private` and `@deprecated` included. Storefront:
  templates and blocks, and the JS plugins `main.js` registers with their
  options and public methods. Also the Twig functions, filters and tags core
  adds, and whether the admin and storefront build with webpack or Vite.
- `api-diff` reports these surfaces (`admin`, `storefront`, `twig`,
  `build`). `api-facts` reads an extension's admin overrides, storefront
  templates, plugin overrides, Twig calls and admin `webpack.config.js`,
  and finds an overridden block through the template's `sw_extends` chain
  or the component it extends.
- Three blind review pairs for `PLG-001` on frontend API core removed in
  6.7: a storefront template, a storefront JS plugin and an admin block.

### Fixed

- The index timeline merges one release at a time; with phase 4 the full
  build ran out of memory.

## [0.12.0] - 2026-10-22

### Added

- WP11 phases 0 to 2: a public API index of `shopware/shopware`.
  `tools/api-index` builds the PHP surface of every tag since 6.5.0.0 plus
  trunk into one timeline, with internal, deprecated, experimental, final
  and BC-change flags per release. A weekly workflow publishes it as the
  `api-index` release asset.
- `api-facts` reports, for an extension and its `composer.json` range, the
  Shopware API it uses that is missing, internal, deprecated or changed in
  part of the range, and guards on API every release already has. A class
  guard counts only for the releases without the class. The extension
  review lenses and `version-compatibility.md` point at it.
- Review pairs for PLG-001 (`review-supported-range-*`,
  `review-in-minor-range-*`), REV-015 (`review-dead-version-guard-*`,
  `review-unneeded-guard-*`) and PLG-024 (`review-later-member-guard-*`).
  The last three pairs use API no skill names; with `api-facts` Haiku
  catches 15 of 15, with skills alone 5 of 15.
- Review graders take an `also` list of rule IDs that are as right as the
  expected one.

### Fixed

- PLG-024: `CacheTagCollector` exists from 6.6.6.0 but `addTag()` only from
  6.7.2.0, so the guard example checks the method.

## [0.11.0] - 2026-10-22

### Added

- Six review pairs for problems that turn on a version or API fact:
  - PLG-007: a 6.7 subscriber to a `*RouteCacheTagsEvent` that is no longer
    dispatched (`review-cache-tags-event-*`)
  - ADM-004: a flat privilege mapping that registers but breaks the role
    screens (`review-admin-privilege-shape-*`)
  - ADM-009: a `webpack.config.js` the 6.7 Vite build ignores
    (`review-admin-webpack-config-*`)
  - SF-009: `sw_csrf()`, removed in 6.5, in a new storefront form
    (`review-sw-csrf-*`)
  - PLG-026: a new `services.xml` in a plugin that targets 6.8
    (`review-services-xml-68-*`)
  - PLG-016: `Context::createDefaultContext()` for storefront product data
    (`review-storefront-default-context-*`)
- `validate-rules` fails when a review task expects a rule that is tagged
  where the reviewing skill cannot read it. It moved the tags of PLG-003,
  TEST-016 and TEST-035 into borrowed references, and
  `shopware-extension-review` now borrows `removals-and-shims.md` (CORE-063)
  and, for a plugin's own cache, `impact-review.md` (IMP-008).
- The `version-compatibility.md` route also fires on a plugin
  `services.xml` or `routes.xml`.

### Changed

- `shopware-pr-description` follows the five-section core PR template from
  shopware/shopware#21627: "What and why?", "How?" with an optional
  "Impact" sub-section, "Testing", "Additional notes" and the new
  checklist. The template's agent block on trunk wins over the skill. Its
  rules are tagged PRD-001 to PRD-009. The `pr-no-ai-trailers` grader
  checks trailers in any capitalisation and each kept text under its own
  section.
- WP6 acceptance: the skills must win on at least four review catch tasks
  for plugin and app rules, not four of the six WP5 tasks, which Haiku
  catches without the skill.

### Fixed

- ADM-004, ADM-009, SF-009 and PLG-007 are tagged in the references
  `shopware-extension-review` borrows, not in a `SKILL.md` it never reads.
  The review cited ADM-016 for the privilege shape, the nearest ID it saw,
  and had no Vite fact for ADM-009 at all.
- ADM-004: the flat privilege shape passes `isPrivilegeMapping` and then
  throws in the role screens; every role needs `dependencies`, even `[]`.
- PLG-007: `addTag()` exists from 6.7.2; 6.7.0 and 6.7.1 dispatch
  `AddCacheTagEvent`. `cache-tag-no-deprecated-event` accepts that event.

## [0.10.0] - 2026-10-21

### Added

- Five rules from a real review of a plugin, each with a review pair:
  - ADM-042: a core component override calls `$super` for every method it
    replaces (`review-admin-override-super-*`)
  - ADM-043: a plugin role never grants `system_config` privileges
    (`review-acl-system-config-*`)
  - ADM-044: one Administration bundle for 6.5 and 6.6+ binds `sw-*` form
    fields with `v-model:value` (`review-admin-field-event-*`)
  - SEC-008: a stored idempotent response is replayed only to its caller
    (`review-idempotency-key-scope-*`)
  - PLG-032: boot-time code does not use a suggested package outside its
    guard (`review-optional-package-guard-*`)
- `shopware-extension-review` lenses ask about the five rules; the near-miss
  table points at ADM-042, ADM-043 and SEC-008, and
  `review-idempotency-scope-near-miss` accepts SEC-008.

### Fixed

- `shopware-extension-review` opens each selected reference by its path.
  One A/B run reported the references as missing because file search does
  not follow the symlinked skill folders.

## [0.9.0] - 2026-10-21

### Added

- Near-miss review tasks (`review-<topic>-near-miss`): a real problem next
  to a rule that does not cover it. The finding must not cite that decoy
  rule. Four tasks, from rule IDs a real plugin review got wrong: `SF-013`,
  `IMP-008`, `REV-033` and `SEC-005`. Graded by `reviewNearMiss`.
- `shopware-extension-review` cites a rule only when the rule's own
  sentence covers the finding, and writes `null` otherwise. `lenses.md`
  lists the near misses and asks about raw SQL writes (`PLG-003`,
  `REV-024`, `PLG-007`), `uninstall()` (`PLG-008`) and admin ACL for new
  associations (`ADM-004`). Findings that copy core behavior say "same as
  core".
- `shopware-extension-review` (plan WP6): reviews a plugin or app diff as a
  whole and ends with the findings JSON of the review tasks. It defines no
  rule; its `routes.json` borrows the references of the topic skills.
  Install line in `use-cases/extension-review.md`.
- Borrowed routes: a route for `../<skill>/references/<file>.md` with no
  triggers of its own takes them from the owning skill. A `routes.json`
  `audience` makes `validate-rules` require every out-of-audience rule in a
  borrowed reference to be named in the borrowing skill.
- WP7 phases B and C. Ten new review pairs, each backing a new rule:
  - PLG-031: never make an existing API route stricter (`review-store-api-stricter-request-*`)
  - SEC-007: do not change access or cache defaults of a released route (`review-route-defaults-changed-*`)
  - SF-011, SF-012, SF-013: JS plugin options and events, snippet keys and
    theme fields are public API; never switch the HTTP cache off from the side
  - IMP-008: a cache key holds every input (`review-cache-key-missing-input-*`)
  - ADM-039, ADM-040: Administration component API and position identifiers,
    in the new `shopware-admin-js` reference `extension-api.md`
  - ARCH-005: extension event properties are the contract; no whole `Request`
  - CORE-063: a deprecation points at a replacement extensions can use today
- Core-only rules CORE-064..077 (shims, data and config BC, CLI, platform
  scope, asset lifetime) in four new `shopware-core-development` references,
  without evals (`audience: ["core"]`).
- `core_guide_ids` now map the core review-guide IDs of #21455 onto existing
  rules where they already state the rule.
- `shopware-security` (SEC-001..007) and `shopware-change-impact`
  (IMP-001..008) carry rule IDs; their existing tasks back SEC-001, SEC-003,
  SEC-004, IMP-001, IMP-002, IMP-006 and IMP-007.
- Eight more review eval pairs (plan WP5 done, WP7 phase A): planted
  problem in `-catch`, clean look-alike in `-ignore`, graded by
  `tools/bin/grade-findings.ts`.
  - `review-migration-customized-data-*`, `review-migration-feature-flag-*`,
    `review-migration-narrowing-update-*`, `review-migration-unbatched-backfill-*`
  - `review-reset-interface-*`, `review-queue-inline-fallback-*`,
    `review-test-cannot-fail-*`, `review-twig-block-removed-*`
- New rules, each backed by its catch task:
  - PLG-028: content migrations skip rows the merchant edited.
  - PLG-029: no feature flags in migrations.
  - PLG-030: `update()` never narrows a column; that goes to `updateDestructive()`.
  - ARCH-001: a service that memoizes in a property implements `ResetInterface`.
  - REV-033: no inline synchronous fallback for queued work.
  - SF-001: deprecate shipped Twig blocks, variables and templates before renaming them.
  - TEST-035: a test must be able to fail.
- `shopware-architecture` and `shopware-storefront` carry rule IDs
  (ARCH-002..004, SF-002..010); the storefront tasks now back SF-002..010.
  PLG-019 gets an eval. Catalog entries for the new rules list their core
  guide IDs in `core_guide_ids`.
- Routes: `symfony-in-shopware.md` loads for `ResetInterface`, `kernel.reset`
  and `$this->x[$k] ??=` memos; `dal-and-performance.md` for queued work.
  Routing cases `memoized-service` and `queued-work`.
- Review-shaped evals (plan WP5, first two pairs). `review-<rule>-catch`
  tasks plant a problem in `diff.patch`; `-ignore` tasks show a clean
  look-alike. The agent reports findings as one fenced `json` block, and
  `tools/bin/grade-findings.ts` grades it: the catch task needs a finding at
  the file and severity that names the rule by ID or in its own words; the
  ignore task fails on any such finding above `nit`. Pairs:
  `review-event-hook-assert-*` (TEST-016) and `review-store-api-contract-*`.
- PLG-027 in `shopware-plugin-development`: never change the type or
  nullability of an existing API response field; add a new field and
  deprecate the old one.

- Weekly trunk mining (plan WP8). `tools/bin/mine-trunk.ts` reads the
  `shopware/shopware` trunk commits since `docs/.mining-state.json` that touch
  `.agents/`, `coding-guidelines/`, `src/Core/DevOps/StaticAnalyze/` or the PR
  template. It reports:
  - core guide IDs that no rule cites in `core_guide_ids`
  - PHPStan and Danger rule classes that were added, removed or renamed,
    and changes to classes that `enforced_by` cites
  - changed guideline headings, agent skill bullets and PR template lines
  `.github/workflows/mine-trunk.yml` posts the report as a `trunk-drift` issue
  every Monday. A `/mined` comment opens a PR that moves the state. Tested
  offline on recorded API responses for 2026-10-13..2026-10-19.
- Eval plan, gate and diff in TypeScript (plan WP10 step 1). The logic lives
  in `tools/src/` as pure functions over typed A/B records, with unit tests.
  `scripts/eval-plan.sh`, `eval-gate.sh` and `eval-diff.sh` keep their
  arguments, environment variables and output, and now call
  `tools/bin/eval-*.ts`. They need Node 24, which the `evals.yml` jobs and the
  runner self-test job now set up. A non-numeric `EVAL_GATE_*` setting is now
  a usage error (exit 2) instead of a crash.
- A/B runner in TypeScript (plan WP10 step 2). `evals/runner/ab.sh` and
  `run-task.sh` now call `tools/bin/ab.ts` and `run-task.ts`; arguments,
  environment, JSONL lines and exit codes are unchanged. New
  `EVAL_AGENT_TIMEOUT_SECONDS` stops a hung agent and every process it
  started, and an agent that leaves a background process holding its output
  no longer blocks grading.
- Agent adapters and the skills profile in TypeScript (plan WP10 step 3).
  `evals/runner/opencode-task.sh`, `claude-task.sh`, `opencode-activation.sh`,
  `claude-activation.sh` and `skills-profile.sh` now call `tools/bin/`. The
  inline Python event parsing became typed parsers, tested on a recorded
  OpenCode and a recorded Claude Code session. Output, logs and exit codes
  are unchanged; the adapters no longer need `python3`, and the OpenCode
  timeout no longer needs a watchdog subshell.
- Activation evals and the local eval run in TypeScript (plan WP10 step 4).
  `scripts/run-activation-evals.sh` and `scripts/eval-local.sh` now call
  `tools/bin/activation.ts` and `eval-local.ts`; output and exit codes are
  unchanged. A skill now counts as activated only when the agent output
  names it as a whole entry, not inside a longer name. The activation run
  prints its summary line even when an agent error stops it.
- Skill validation in TypeScript (plan WP10 step 5). `scripts/validate-skills.sh`
  now calls `tools/bin/validate-skills.ts`, which runs the rule ID and route
  checks in the same process instead of starting `node` twice. The output
  and exit code on the repository are unchanged. A description is now
  measured without the leading space the bash version counted on folded
  (`>-`) descriptions, and any top-level frontmatter key ends a folded
  description, including one with no value on its line.
- The last helper scripts in TypeScript (plan WP10 step 6).
  `evals/test-graders.sh`, `evals/runner/fake-agent.sh` and
  `scripts/check-update.sh` now call `tools/bin/test-graders.ts`,
  `fake-agent.ts` and `check-update.ts`. Golden grader output and exit codes
  are unchanged on all 64 tasks, and the fake agent behaves the same in all
  2,268 combinations of its settings. `check-update` asks the GitHub API
  directly instead of trying `gh` and then `curl`, sends `GH_TOKEN` or
  `GITHUB_TOKEN` when set, and names the reason when the lookup fails. The
  `grader-golden` CI job now runs on Node 24.
- Strict lint and format for `tools/`: oxlint with type-aware rules (built on
  typescript-go, so it checks against TypeScript 7) and oxfmt, both in the
  `tools` CI job as `npm run lint` and `npm run format:check`. No `any`, no
  unchecked casts or non-null assertions, no `||` on nullable values, no
  floating promises, and no `process.exit`. All findings are fixed, with no
  suppressions. JSON the tools read (`rules/catalog.json`, `routes.json`, A/B
  results) is now checked field by field. A malformed record is reported
  with its line and field instead of passing as a typed value.

- Path-based reference routing. Each skill with references has a
  `routes.json` that maps changed-file globs and diff-line regexes to the
  reference to read. The routing list in `SKILL.md` is now a generated table
  (`tools/bin/render-routes.ts`), `tools/bin/route.ts` prints what a diff
  selects, and `evals/routing/` holds eight diff cases that `npm test` checks
  on every push. `validate-skills.sh` fails on a missing target, an unrouted
  reference or a stale table.
- "Already enforced by CI (do not repeat)" sections in `shopware-testing`,
  `shopware-core-development`, `shopware-plugin-development`,
  `shopware-admin-js` and `shopware-review-learnings`. Each bullet names the
  CI check, what it catches and what it misses, so reviews flag only the
  gaps. `tools/bin/render-enforced.ts` generates them from the new
  `trunk.enforced_by` objects in `rules/catalog.json`; the validator fails
  on drift.
- Rule IDs for `shopware-core-development` (CORE-001 to CORE-062) and
  `shopware-admin-js` (ADM-001 to ADM-038).
- `tools/`: repo tooling in TypeScript, run by Node 24 without a build step,
  type-checked with `tsc` and tested with `node --test` in a new `tools` CI
  job. The rule validator below lives there and also checks catalog field
  types. Plan WP10 moves the eval runner next.
- Rule IDs and a rule catalog. Every rule in `shopware-testing`,
  `shopware-plugin-development` and `shopware-review-learnings` starts with a
  stable ID such as `**TEST-016**`, and `rules/catalog.json` links it to its
  file, eval task, trunk source and audience. `tools/bin/validate-rules.ts`
  (run by `validate-skills.sh`) fails on unknown, duplicated, misplaced or
  retired IDs, missing eval tasks, and rules with neither an eval nor a
  reason, and prints eval coverage per skill.
- Real model evals in CI (`evals.yml`). It shards A/B runs across parallel
  jobs and gates them with `scripts/eval-gate.sh`. A monthly bot PR records
  each baseline under `evals/baselines/`. Labeled PRs run only the tasks
  they touch. The default agent is OpenCode with a free model, so CI needs
  no API key or secret.
- OpenCode adapters `evals/runner/opencode-task.sh` and
  `opencode-activation.sh` (free models, isolated `HOME`, step cap and
  timeout), Claude Code adapter `evals/runner/claude-task.sh`, and
  `evals/runner/skills-profile.sh` to switch skills on or off per workdir.
  `evals/runner/install-agent.sh` installs a pinned CLI in CI.
- `scripts/eval-plan.sh`, `scripts/eval-gate.sh` and `scripts/eval-diff.sh`.
- Skill-load tracking for A/B runs. The adapters report which skills they
  loaded, `ab.sh` records `loaded_on` and `loaded_off`, and the gate fails
  when fewer than half of the skill-on runs load a task skill, or when a
  skill leaks into a skill-off run. A model that ignores skills can no longer
  produce a green run that measured nothing.
- `ab.sh` scores completed runs only, so one agent error no longer discards
  a task's verdict, and treats a pass-rate gap below `EVAL_AB_MIN_DELTA_PCT`
  (50 points) as noise instead of `improved` or `worse`.
- `scripts/eval-local.sh` runs the A/B and the gate with a CLI you are
  already logged in to (Claude Code by default, or OpenCode with your
  logins via `OPENCODE_AUTH_FILE`), without API keys or free-tier limits.
- `run-task.sh` retries agent errors (free models answer "Rate limit
  exceeded") on a fresh workdir, and logs the error reason to the CI log.
- `evals/runner/selftest.sh` with `fake-agent.sh`. It checks the whole eval
  pipeline without model calls on every push.
- `shopware-podman-dev`: OpenSearch is opt-in per lane (compose profile
  `opensearch`). The skill says when a task needs it and how to enable it for
  one lane without starving the shared Podman VM.
- `shopware-testing`: observing events in tests. Use an owned
  `CollectingEventDispatcher` in unit tests or `EventHookDispatcher::on()` in
  integration tests. Capture in the hook and assert afterwards, and never add
  listeners to the shared `event_dispatcher`. New eval
  `event-hook-capture-then-assert`, with an AST grader and snippet tests.
- `shopware-core-development`: `Feature::throwIfActive()` for deprecated
  exception classes and framework callbacks, and neutral return values for
  discovery methods.
- `docs/plans/2026-10-skills-evolution.md`: the accepted roadmap. It covers
  rule IDs, real model evals, path routing, review evals and an extension
  review skill.

### Changed

- Task graders are TypeScript: `tools/graders/<task>.ts` holds the checks
  of 98 tasks, and every `grade.sh` is the same wrapper over
  `tools/bin/grade.ts`. `evals/grade-helpers.sh` and
  `tools/bin/grade-findings.ts` are gone; `tools/src/grade/` replaces them.
  The AST graders stay in `evals/tools/ast/`.
- `evals/runner/selftest.sh` and its `eval-runner-selftest` CI job are
  gone. The unit tests in the `tools` job now cover its cases, including
  the command-line layer and a check that every shell wrapper reaches its
  bin.
- Model evals record token use. The Claude and OpenCode adapters write each
  session's input and output tokens, `ab.sh` stores the averages per mode as
  `tokens_on` and `tokens_off`, the gate summary shows them per task, and
  `eval-diff.sh` compares skill-on tokens between two result files. The
  runner self-test now covers the Claude adapter with a fake `claude` binary.
- Reference routes can be `on_demand`: the task decides, not the diff, and
  the router never selects them. `when-stuck.md`, `docs-map.md` and
  `change-scope.md` use it instead of proxy triggers such as
  `@phpstan-ignore` or an `always` route. `tools/bin/route.ts` now reports
  `selected`, `always` and `on_demand` apart, and the routing cases check
  only what the diff selects. The tables in `SKILL.md` show at most two
  globs and one regex per row, which cuts them by about 15 %.
- The default eval model is `opencode/longcat-2.5-preview-free`. It loaded a
  task skill in 5 of 8 tasks; the previous default, Nemotron 3 Ultra, in 1 of 8.
  CI uses 8 parallel A/B jobs.

- `evals/runner/ab.sh` writes one JSON line per task. Its exit code is the
  verdict: improved, held, no difference, worse or error. It refuses to run
  without a skill profile command, because "on" and "off" would otherwise
  load the same skills.
- `evals/runner/run-task.sh` exits 4 on an agent error instead of counting it
  as a failed task. It removes the skill profile before grading.
- Layer 1 reads `SKILLS_ACTIVATION_CMD`, with `SKILLS_AGENT_CMD` as fallback,
  so activation and task agents can share one environment.
- `admin-acl-role-migration` now requires
  `MigrationStep::addAdditionalPrivileges()`. A raw SQL update of `acl_role`
  is the near-miss fail fixture.
- `shopware-plugin-development` migrations: large data changes run in
  ordered batches, and derived data goes to an indexer or `PostUpdateIndexer`.
  Before, heavy work was sent to `update()` or a command.
- `shopware-core-development`: one marker per surface (`@internal`,
  `@experimental`, `@final` or `final class`) replaces "prefer `final` over
  `@internal`".
- `shopware-testing`: Danger's one-covers-class rule applies to every added
  or modified test file.
- Alignment doc: mining pass 2026-10-19 and an updated watchlist.

### Fixed

- `mwg-only-after-shopware-primitive` now fails when the agent adds a
  modern-web-guidance skill; the shell check could never match.
- `no-access-key-in-source` counts a key read from `$_ENV`; the shell
  pattern treated `$` as an anchor.
- The weekly eval workflow reported success while skipping every model step,
  and its pass-rate gate could never fail. It now runs on free models, and
  `agent=claude` without `ANTHROPIC_API_KEY` fails instead of skipping.
- `shopware-admin-js` no longer tells you to write `acl_role.privileges` with
  SQL, and no longer claims that Admin flag names must be uppercase. Both
  contradicted the core review guides.

## [0.8.0] - 2026-10-14

### Fixed

- Activation prompts no longer expose quoted routing notes to the model.
- The Claude activation adapter and runner fail on CLI/API errors instead of
  scoring them as silent skill selection.

- `docs/local-validation.md` no longer tells you to run
  `npx skills disable` / `enable`. The skills CLI (v1.7) has no such
  commands; the A/B step now uses `npx skills remove` plus the pinned
  `add`, or `evals/runner/ab.sh` for eval tasks.
- CHANGELOG sections and compare links for v0.4.0, v0.5.0 and v0.6.0 were
  missing; `[Unreleased]` compared against v0.3.0.
- Stray triple spaces in the `shopware-admin-js` and `shopware-storefront`
  descriptions.

### Changed

- Skill descriptions use prose trigger conditions; reference indexes explain
  when to read each file. Every skill has Codex interface metadata.
- Added a Claude activation adapter and three behavioral evals:
  `support-reply-single-block`, `review-triage-with-confidence`, and
  `linked-project-runs-in-container`. All three helped in two saved Claude
  A/B rounds. The activation comparison needs a rerun because the original
  adapter suppressed session-limit errors.

- Every skill declares `license: MIT` in its frontmatter, as core trunk
  skills do.
- `docs/core-pr-17657-alignment.md`: new mining pass against trunk
  2026-10-13 (PRs merged after 2026-09-28, plus open PRs to watch). The
  three rows marked "documented" that already have evals now link them.
  `AGENTS.md` and the alignment doc agree on the last mined date.
- README skill index describes `shopware-core-development` the way its
  description does now: public API, deprecation, PHPStan baseline,
  RELEASE_INFO.
- Skill descriptions match the sentence that starts the work. A private
  core bugfix stays with `shopware-php-code`. `shopware-core-development`
  opens for a public API, a deprecation, the PHPStan baseline, or
  RELEASE_INFO. `shopware-change-impact` opens when the next step is a
  commit or a PR. `shopware-security` opens for a route, controller, ACL,
  webhook, or secret. `shopware-architecture` opens when the choice is an
  event, a decoration, or a core edit. On trunk, a plain "add a test" stays
  with `shopware-phpunit-tests`, and "open the PR" stays with
  `shopware-pr-hygiene`. `validate-skills.sh` accepts a description
  that quotes no trigger phrase.
- `shopware-architecture` opens when a change introduces a new structure,
  or can break an existing one without the diff saying so. A silent second
  path is one case, not the whole skill. Writing the ADR or `RELEASE_INFO`
  stays with `shopware-core-development`.

## [0.7.0] - 2026-10-02

### Fixed

- Podman dev skill: container-created files (webpack `dist/`, `.env.local`,
  `install.lock`) vanish because the lane's Mutagen session runs as
  `one-way-replica`, not because of `two-way-resolved` host wins. Documents how
  to check the session mode and the `theme:change Storefront --all --sync` step
  for fresh lanes whose storefront renders without CSS.
- Trunk overlay: `sw-dev link` must not replace git-tracked core skills
  (same-named `shopware-admin-js`) or `.claude/skills` when it aliases
  `.agents/skills`. Cursor/Codex still get our Admin JS overlay.
  `shopware-storefront` stays on the core-overlay preset (no core equivalent).

### Changed

- Copilot leftover holes: JS-to-TS matches basename `product-card.ts` and
  an exact import path segment; `CoversClass` is counted per file; PluginManager
  listeners must sit on the module registered as `ScrollHint`.
- Dual-major feature flags (#20117): unit tests disable the newer major;
  `integration-major` is one lane per `FEATURE_ALL=<major>`. Last mined
  trunk 2026-09-14.
- Plugin DI: 6.8-targeted plugins use PHP `ContainerConfigurator`, not
  `services.xml`. `config.xml` stays XML.
- Local execution: Podman on linked shopware-dev; `shopware-cli` on CLI
  projects. MCP never blocks a fallback. Tooling-stack docs drop hook-enforced
  ai-coding-tools as the default.
- PHP method flatten strips comments first; ACL mapping shape is read
  from the `addPrivilegeMappingEntry()` argument; `CoversClass` ignores
  commented-out attributes.
- Adversarial grader pass: scoped helpers strip comments and extract PHP
  methods; new graders must check the subject relationship, not leftover
  tokens. Almost-pass sneak-fails added or replaced for ACL, modal, Jest,
  JS-to-TS, coverage ignore, DI tags, BCChange, `setAutoExit`, MWG, and
  `CoversClass`.
- Sixth Copilot pass: ACL SQL must live in a `MigrationStep::update()`,
  PR trailer evals keep each section's description, listing evals keep
  `ListingPageController`, and PluginManager listeners must sit on the
  plugin class rather than in `main.js`.
- Fifth Copilot pass: ACL mapping must use `roles.viewer.privileges`,
  `mt-modal` is required when the module has no local `sw-modal`,
  `StaticEntityRepository` assertions must observe `load()`, and
  `setAutoExit(false)` must run before `Application::run()`. Twig
  snippet tokens must sit inside the overridden block. MWG license
  note is Apache-2.0.
- ACL WHERE must select `swag_example.viewer` (not any filter), named
  arguments must keep `true` / `0` / `null`, and UPGRADE past tense is
  scoped to the CartProcessor section.
- Fourth Copilot pass plus self-review of new graders: ACL migration
  now scopes `product:read` to existing module roles, Jest requires a
  real case/assertion, `StaticEntityRepository` must be wired into
  `ProductLoader`, listing eval grades document `no-store` not client
  fetch cache, `exit;`/`die` and `->has()` assertions are required,
  RELEASE_INFO entries must sit in the existing Features section.
  Added `mwg-only-after-shopware-primitive`. Documented grader
  sneak-fail rules in `AGENTS.md`.
- Third Copilot pass: Admin `main.js` entry is the TypeScript exception,
  `mt-popover` is not a native popover, `calculate()` may use a receiver
  variable, and PluginManager async `import()` is accepted. Storefront
  cache wording now splits shared HTML vs private async loads. Added
  evals for named arguments, Admin ACL + Jest colocation, DI deprecation
  tags, UPGRADE past tense, listing `no-store` AJAX, Twig block/snippet,
  `exit`/`die`, `StaticEntityRepository`, and `@codeCoverageIgnore`.
- Tightened graders again after the second Copilot pass: assertion must
  bind to `calculate()`, Storefront plugins need a Twig `data-scroll-hint`
  host plus `window` add/remove, and `Filesystem` must be constructor-
  promoted. Added evals `release-info-no-duplicate-heading` and
  `pr-no-ai-trailers`.
- Tightened new behavioral graders and smoke defaults after PR review:
  exact BCChange metadata, class-docblock `@internal`, constructor-injected
  `Filesystem`, `assertSame` on public APIs, Storefront `window` + `data-*` +
  `destroy()`, checkout prefetch/`sw_extends`/`parent()`, Admin popover ban,
  and `test-graders.sh` now runs both `fixture/` and `fixtures/fail/`.
  Storefront CSRF/`sw_csrf` guidance dropped (gone since 6.5). App use-case
  no longer routes Meteor Admin SDK to `shopware-admin-js`.
- Mined `shopware/shopware` trunk skills as of 2026-09-01 (after #17657):
  BC-change attributes vs `@deprecated reason:*`, PHPUnit reflection / one
  `CoversClass` / `@internal` / `StaticEntityRepository` inference, Symfony
  `Filesystem`, named arguments, release-note heading rules, no AI PR trailers.

### Added

- Plugin 6.8 preparation stays on the supported `composer.json` range. Test
  with `V6_8_0_0=1`, not `FEATURE_ALL`. Call out behavior that still compiles
  (cache rework, cart tax cents, document generation v2, flows after the
  business process). The flag's separate container is a test switch.
  Storefront Twig 4 drops `spaceless` and null HTML attributes. Administration
  Twig overrides are not rewritten to the experimental Vue SFC API
  ([shopware/shopware#21162](https://github.com/shopware/shopware/discussions/21162)).
  Evals: `prepare-plugin-for-6-8`, `twig4-spaceless-and-null-attribute`,
  `admin-sfc-not-a-6-8-migration`.
- `shopware-change-impact`: after a feature works, review blast radius before
  calling it done (shared HTTP cache, checkout cost for shops that do not use
  the feature, asset loading tested only against the local disk while
  production assets are on S3, a Symfony container `if` that would compile a
  different container per feature flag, easier vs more complex). Verdict is
  ship, narrow the design, or do not ship. Evals:
  `feature-impact-before-done`, `asset-loading-remote-filesystem`,
  `container-if-splits-saas`.
- Mined trunk skills through 2026-09-28: new Store API routes use a typed
  extension event instead of a new abstract route class; repository integration
  tests use `KernelTestBehaviour` and `DatabaseTransactionBehaviour` when that
  is all they need; a test that asserts a throw while a major flag is active
  is `@deprecated tag:` on that method.
- Eval tasks: `bc-change-not-deprecated-reason`, `one-covers-class-per-file`,
  `test-class-marked-internal`, `no-reflection-on-shopware-method`,
  `symfony-filesystem-over-raw-php`, `storefront-plugin-manager-register`,
  `no-speculation-on-checkout`, `admin-use-mt-modal`,
  `release-info-no-duplicate-heading`, `pr-no-ai-trailers`,
  `named-arguments-for-literals`, `admin-acl-role-migration`,
  `admin-jest-colocated-spec`, `di-tag-not-while-referenced`,
  `upgrade-entry-past-tense`, `storefront-no-blocking-nostore-ajax`,
  `storefront-twig-block-snippet`, `test-no-exit-die`,
  `static-entity-repository-stub`, `code-coverage-ignore-passthrough`,
  `mwg-only-after-shopware-primitive`, `admin-js-implementation-to-ts`,
  `storefront-no-sw-csrf`, `admin-no-cross-module-import`,
  `storefront-media-thumbnails`, `unit-test-disable-newer-major`,
  `plugin-xml-config-to-php`.
- Skills: `shopware-storefront`, `shopware-admin-js`.
- Use-case: `use-cases/storefront-development.md`.
- Modern Web Guidance as an optional CLI lookup (not a vendored skill).

## [0.6.0] - 2026-07-28

### Added

- `shopware-architecture` and `shopware-security` skills, with the trunk
  skill-resolution model (`docs/skill-resolution.md`): core `.agents/skills/`
  is primary on trunk, this repo is the overlay.
- Core testing rules from PR review feedback, and a test-class `#[Package]`
  eval.

### Changed

- Testing rules synced with core trunk.
- Smoke eval defaults refreshed; markdown lint fixes.
- README install example pinned to v0.6.0.

## [0.5.0] - 2026-06-23

### Added

- Alignment with core PR #17657 (`docs/core-pr-17657-alignment.md`) and eval
  tasks for the mined rules.
- `shopware-review-learnings`: pre-submit quality checks, an interface
  refactor checklist, and `Feature` flag patterns.

## [0.4.0] - 2026-06-19

### Added

- Symfony modernization guidance and a core eval task.
- Local smoke eval harness (`evals/smoke/`) and harder behavioral tasks.
- Shellcheck CI job and golden grader fixtures.

### Fixed

- CI shellcheck and grader-golden jobs restored.
- Cursor smoke evals via browser login.
- markdownlint MD040 and MD034.

## [0.3.0] - 2026-06-18

### Added

- `shopware-core-development/references/platform-architecture.md` — bundle ownership,
  Core/Storefront boundaries, EventListener vs subscriber, `final`, session, migrations.
- `php-foundation`: Shopware trunk habits (`empty()`, interface DI, PSR clock, `@var` discipline).
- `shopware-testing`: unit-first placement, trunk PHPUnit rules (`expectExceptionObject`,
  no `#[Depends]`, no mock `any()`, clock in tests).
- `shopware-review-learnings`: ACL constant-form and migration destructive findings.

### Changed

- `shopware-plugin-development`: inherits trunk PHP habits; thin-controller / OpenAPI pointers.
- `shopware-plugin-development/references/migrations.md`: `updateDestructive()` scope.

## [0.2.0] - 2026-06-11

### Added

- Skills: `shopware-pr-description`, `shopware-pr-review`, `shopware-assistant-style`,
  `shopware-podman-dev` (optional; Podman/Mutagen + `~/shopware-dev` hub).
- `shopware-review-learnings`: pre-submit checklist (CI, PR size, self-review),
  Shopware-specific red flags, OpenAPI schema and thin-controller findings.
- `docs/tooling-stack.md`; FoS shopware-phpunit references in `shopware-testing`.
- Expanded `release-notes-and-adr.md` (from former changelog rule).

### Changed

- README and podman-dev docs: `sw-dev link` as preferred install path; optional podman skill.
- `.gitignore`: `skills-lock.json`, `.agents/` (npx skills add artifacts).

## [0.1.0] - 2026-06-03

### Added

- Initial scaffold of the provider-independent Shopware skills repository.
- Documented install targets for Cursor, Claude Code, Codex and OpenCode.
- Shared `php-foundation` skill (PER-CS + PHPStan baseline, Shopware-aligned).
- Skills organised by **target surface** (what you edit), not persona:
  `shopware-core-development` (platform), `shopware-plugin-development` (PHP
  plugin/project), and `shopware-app-development` (declarative apps). The surface
  skills disambiguate on the path/artifact, are no longer install-time exclusive,
  and coexist safely in a monorepo.
- `shopware-app-development` skill: manifest + least-privilege permissions,
  sandboxed Twig app scripts, webhooks + Admin API, Meteor Admin SDK; with
  `manifest-and-permissions` and `app-scripts` references.
- `shopware-testing` skill (PHPUnit unit/integration standards).
- `shopware-review-learnings` skill (seeded entries + structured TODO slots).
- `shopware-research-and-escalation` meta-skill (docs map, Context7 policy, when-stuck ladder).
- `use-cases/` install recipes per use-case: `plugin-development.md`,
  `app-development.md`, and `core-development.md`.
- Real documentation links in the `core`, `plugin`, and `app` skills' further
  reading, and the feature-flag deprecation annotations (`@feature-deprecated`,
  `@major-deprecated`) in the core deprecations reference.
- Eval suite: per-skill activation evals (Layer 1), behavioral fixture tasks (Layer 2),
  and an A/B runner (Layer 3) with optional Harbor wiring.
- `scripts/`: `check-update.sh`, `validate-skills.sh`, `run-activation-evals.sh`.
- CI: `validate.yml` (every PR) and `evals.yml` (gated).
- `.markdownlint.jsonc` config; CI Markdown lint enforced (no longer
  `continue-on-error`) and CI actions pinned to Node 24 runtimes
  (`actions/checkout@v5`, `markdownlint-cli2-action@v23`).
- `docs/local-validation.md` and GitHub issue templates for feedback.

[Unreleased]: https://github.com/BrocksiNet/ai-skills-shopware/compare/v0.14.0...main
[0.14.0]: https://github.com/BrocksiNet/ai-skills-shopware/compare/v0.13.0...v0.14.0
[0.13.0]: https://github.com/BrocksiNet/ai-skills-shopware/compare/v0.12.0...v0.13.0
[0.12.0]: https://github.com/BrocksiNet/ai-skills-shopware/compare/v0.11.0...v0.12.0
[0.11.0]: https://github.com/BrocksiNet/ai-skills-shopware/compare/v0.10.0...v0.11.0
[0.10.0]: https://github.com/BrocksiNet/ai-skills-shopware/compare/v0.9.0...v0.10.0
[0.9.0]: https://github.com/BrocksiNet/ai-skills-shopware/compare/v0.8.0...v0.9.0
[0.8.0]: https://github.com/BrocksiNet/ai-skills-shopware/compare/v0.7.0...v0.8.0
[0.7.0]: https://github.com/BrocksiNet/ai-skills-shopware/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/BrocksiNet/ai-skills-shopware/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/BrocksiNet/ai-skills-shopware/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/BrocksiNet/ai-skills-shopware/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/BrocksiNet/ai-skills-shopware/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/BrocksiNet/ai-skills-shopware/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/BrocksiNet/ai-skills-shopware/releases/tag/v0.1.0
