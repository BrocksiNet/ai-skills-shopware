# Profile: plugin / app / project development

For building Shopware 6 plugins, apps, and customer-project code on top of the
platform. This is the **pragmatic** profile (smallest coherent safe change).
Install it *instead of* the core profile — never both in the same project.

## Skills in this profile

| Skill | Why |
| ----- | --- |
| `php-foundation` | Shared strict PHP 8.x base. |
| `shopware-plugin-development` | DAL, services, cache tags, migrations, decoration, 6.6/6.7 compat. |
| `shopware-testing` | PHPUnit unit/integration standards. |
| `shopware-research-and-escalation` | Verify against installed source; escalate instead of guessing. |
| `shopware-review-learnings` | Recurring real-world findings (API-aware, DAL, performance). |

## Install (one-liner)

```bash
# Cursor (use -a claude-code, -a codex or -a opencode for the other tools)
npx skills add BrocksiNet/ai-skills-shopware \
  --skill php-foundation \
  --skill shopware-plugin-development \
  --skill shopware-testing \
  --skill shopware-research-and-escalation \
  --skill shopware-review-learnings \
  -a cursor
```

Add `-g` for a user-level (all projects) install. Pin a version with
`BrocksiNet/ai-skills-shopware@vX.Y.Z`.

## Notes

This profile deliberately omits `shopware-core-development` so strict
core-contribution rules (baseline discipline, deprecation cycles) do not fire on
plugin code. If you contribute to core, use [`core.md`](core.md) instead.
