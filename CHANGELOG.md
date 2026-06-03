# Changelog

All notable changes to this skills repository are documented here. Release tags
drive version pinning for `skills.sh` installs (`npx skills update`).

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/BrocksiNet/ai-skills-shopware/commits/main
