# Use-case: plugin / project development

For building PHP extensions on top of Shopware 6: plugins under `custom/plugins`
and customer-project code. This is the **pragmatic** surface (smallest coherent
safe change that fits how Shopware wants you to extend it).

## Skills for this use-case

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

Install at **project level** (the default) so the version pin stays per-project
and reproducible for the team; `-g` installs user-level (all projects) but is
then global and effectively unpinned. Pin a version with
`BrocksiNet/ai-skills-shopware@vX.Y.Z`.

## Mixing use-cases

The surface skills route by what you edit, so installing more than one use-case
set together is fine. If you also build declarative apps, add the skills from
[`app-development.md`](app-development.md); if you also contribute to the platform,
add the ones from [`core-development.md`](core-development.md). The shared base
plus the testing, research and review skills are the same in every use-case.
