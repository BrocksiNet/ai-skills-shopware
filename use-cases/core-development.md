# Use-case: platform / core contribution

For changing the Shopware **platform** itself (`shopware/shopware`, `shopware-core`
packages, first-party bundles under `src/`). This is the **strict** surface:
platform code runs in thousands of plugins, so it asks for a full deprecation
cycle, release-notes entries, `@internal` boundaries and PHPStan baseline
discipline.

## Skills for this use-case

| Skill | Why |
| ----- | --- |
| `php-foundation` | Shared strict PHP 8.x base. |
| `shopware-core-development` | Deprecations, release notes (RELEASE_INFO/UPGRADE) + ADR, PHPStan baseline, `@internal`. |
| `shopware-testing` | PHPUnit unit/integration standards. |
| `shopware-research-and-escalation` | Verify against installed source; escalate instead of guessing. |
| `shopware-review-learnings` | Recurring real-world findings. |
| `shopware-pr-description` | GitHub PR body for shopware/shopware (migrated from `.cursor/rules/pr-template.mdc`). |
| `shopware-assistant-style` | Communication style and support-ticket copy format (migrated from `.cursor/rules/shopware-rules.mdc`). |
| `shopware-pr-review` | React to GitHub review comments (migrated from `.cursor/rules/review.mdc`). |
| `shopware-podman-dev` | Podman/MCP execution — never host php/composer/phpunit on linked checkouts. |

## Install (one-liner)

```bash
# Cursor (use -a claude-code, -a codex or -a opencode for the other tools)
npx skills add BrocksiNet/ai-skills-shopware \
  --skill php-foundation \
  --skill shopware-core-development \
  --skill shopware-testing \
  --skill shopware-research-and-escalation \
  --skill shopware-review-learnings \
  --skill shopware-pr-description \
  --skill shopware-assistant-style \
  --skill shopware-pr-review \
  --skill shopware-podman-dev \
  -a cursor
```

Install at **project level** (the default) so the version pin stays per-project
and reproducible for the team; `-g` installs user-level (all projects) but is
then global and effectively unpinned. Pin a version with
`BrocksiNet/ai-skills-shopware@vX.Y.Z`.

## Ownership and mixing use-cases

The `shopware-core-development` skill is platform/maintainer-controlled; changes
go through PR review. If you also build extensions, add the skills from
[`plugin-development.md`](plugin-development.md) or
[`app-development.md`](app-development.md). They coexist safely and route by
surface, so the strict platform rules only fire on platform code.
