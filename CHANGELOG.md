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
- Profiles: `shopware-core-development` (strict) and `shopware-plugin-development` (pragmatic).
- `shopware-testing` skill (PHPUnit unit/integration standards).
- `shopware-review-learnings` skill (seeded entries + structured TODO slots).
- `shopware-research-and-escalation` meta-skill (docs map, Context7 policy, when-stuck ladder).
- `profiles/core.md` and `profiles/plugin.md` install recipes.
- Eval suite: per-skill activation evals (Layer 1), behavioral fixture tasks (Layer 2),
  and an A/B runner (Layer 3) with optional Harbor wiring.
- `scripts/`: `check-update.sh`, `validate-skills.sh`, `run-activation-evals.sh`.
- CI: `validate.yml` (every PR) and `evals.yml` (gated).
- `docs/local-validation.md` and GitHub issue templates for feedback.

[Unreleased]: https://github.com/BrocksiNet/ai-skills-shopware/commits/main
