# Changelog

All notable changes to this skills repository are documented here. Release tags
drive version pinning for `skills.sh` installs (`npx skills update`).

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

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

[Unreleased]: https://github.com/BrocksiNet/ai-skills-shopware/compare/v0.8.0...main
[0.8.0]: https://github.com/BrocksiNet/ai-skills-shopware/compare/v0.7.0...v0.8.0
[0.7.0]: https://github.com/BrocksiNet/ai-skills-shopware/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/BrocksiNet/ai-skills-shopware/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/BrocksiNet/ai-skills-shopware/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/BrocksiNet/ai-skills-shopware/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/BrocksiNet/ai-skills-shopware/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/BrocksiNet/ai-skills-shopware/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/BrocksiNet/ai-skills-shopware/releases/tag/v0.1.0
