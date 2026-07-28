# Use-case: plugin / project development

For building PHP extensions on top of Shopware 6: plugins under `custom/plugins`
and customer-project code. In-repo core skills are usually **absent** — use the
**full** profile from [`docs/skill-resolution.md`](../docs/skill-resolution.md).

## Skills for this use-case

| Skill | Why |
| ----- | --- |
| `php-foundation` | Shared strict PHP 8.x base. |
| `shopware-architecture` | DAL boundaries, extension mechanisms, thin controllers. |
| `shopware-security` | Access keys, ACL, safe API exposure. |
| `shopware-plugin-development` | DAL, cache tags, migrations, decoration, 6.6/6.7 compat, OpenAPI. |
| `shopware-testing` | PHPUnit unit/integration standards. |
| `shopware-research-and-escalation` | Verify against installed source. |
| `shopware-review-learnings` | Recurring real-world findings. |

## Install (one-liner)

```bash
npx skills add BrocksiNet/ai-skills-shopware \
  --skill php-foundation \
  --skill shopware-architecture \
  --skill shopware-security \
  --skill shopware-plugin-development \
  --skill shopware-testing \
  --skill shopware-research-and-escalation \
  --skill shopware-review-learnings \
  -a claude-code -a codex -a cursor
```

Install at **project level** (the default). Pin with `BrocksiNet/ai-skills-shopware@vX.Y.Z`.

## Mixing use-cases

Surface skills route by what you edit. Add [`core-development.md`](core-development.md)
for platform work; [`app-development.md`](app-development.md) for declarative apps.
