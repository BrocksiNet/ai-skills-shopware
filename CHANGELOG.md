# Changelog

All notable changes to this skills repository are documented here. Release tags
drive version pinning for `skills.sh` installs (`npx skills update`).

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

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
  `storefront-no-sw-csrf`.
- Skills: `shopware-storefront`, `shopware-admin-js`.
- Use-case: `use-cases/storefront-development.md`.
- Modern Web Guidance as an optional CLI lookup (not a vendored skill).

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

[Unreleased]: https://github.com/BrocksiNet/ai-skills-shopware/compare/v0.3.0...main
[0.3.0]: https://github.com/BrocksiNet/ai-skills-shopware/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/BrocksiNet/ai-skills-shopware/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/BrocksiNet/ai-skills-shopware/releases/tag/v0.1.0
