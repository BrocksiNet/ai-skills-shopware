# Use-case: app development

For building declarative Shopware apps under `custom/apps`: a `manifest.xml`,
least-privilege permissions, sandboxed Twig app scripts, and an external backend
reached through webhooks and the Admin API. Apps are **not** plugins: there is no
DI container and no DAL in the shop process.

## Skills for this use-case

| Skill | Why |
| ----- | --- |
| `php-foundation` | Shared strict PHP 8.x base (for any external backend code you write). |
| `shopware-app-development` | Manifest, permissions, app scripts, webhooks, Admin API, Meteor Admin SDK. |
| `shopware-security` | App secrets, least-privilege manifest, webhook verification. |
| `shopware-research-and-escalation` | Verify against installed source; escalate instead of guessing. |
| `shopware-review-learnings` | Recurring real-world findings. |

## Install (one-liner)

```bash
# Cursor (use -a claude-code, -a codex or -a opencode for the other tools)
npx skills add BrocksiNet/ai-skills-shopware \
  --skill php-foundation \
  --skill shopware-app-development \
  --skill shopware-security \
  --skill shopware-research-and-escalation \
  --skill shopware-review-learnings \
  -a claude-code -a codex -a cursor
```

Install at **project level** (the default) so the version pin stays per-project
and reproducible for the team; `-g` installs user-level (all projects) but is
then global and effectively unpinned. Pin a version with
`BrocksiNet/ai-skills-shopware@vX.Y.Z`.

## Mixing use-cases

`shopware-app-development` (declarative manifest + sandboxed app scripts +
external backend) and `shopware-plugin-development` (PHP: DI, DAL, decoration,
migrations) are different surfaces and route by target (`custom/apps` +
`manifest.xml` vs `custom/plugins`). If you build both, add the skills from
[`plugin-development.md`](plugin-development.md) too; they coexist safely.
