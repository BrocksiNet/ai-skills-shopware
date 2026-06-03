# Profile: core development

For contributing to the Shopware core (`shopware/shopware`) and first-party
bundles. This is the **strict** profile. Install it *instead of* the plugin
profile — never both in the same project.

## Skills in this profile

| Skill | Why |
| ----- | --- |
| `php-foundation` | Shared strict PHP 8.x base. |
| `shopware-core-development` | Strict core rules: deprecations, release notes (RELEASE_INFO/UPGRADE) + ADR, PHPStan baseline, `@internal`. |
| `shopware-testing` | PHPUnit unit/integration standards. |
| `shopware-research-and-escalation` | Verify against installed source; escalate instead of guessing. |
| `shopware-review-learnings` | Recurring real-world findings. |

## Install (one-liner)

```bash
# Cursor (use -a claude-code, -a codex or -a opencode for the other tools)
npx skills add BrocksiNet/ai-skills-shopware \
  --skill php-foundation \
  --skill shopware-core-development \
  --skill shopware-testing \
  --skill shopware-research-and-escalation \
  --skill shopware-review-learnings \
  -a cursor
```

Add `-g` for a user-level (all projects) install. Pin a version with
`BrocksiNet/ai-skills-shopware@vX.Y.Z`.

## Ownership

The `shopware-core-development` skill is platform/maintainer-controlled. Changes
go through PR review. Do not install the plugin profile alongside this one.
