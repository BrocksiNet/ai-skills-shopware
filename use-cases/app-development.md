# Use-case: app development

For building declarative Shopware apps under `custom/apps`: a `manifest.xml`,
least-privilege permissions, sandboxed Twig app scripts, and an external backend
reached through webhooks and the Admin API. Apps are **not** plugins: there is no
DI container and no DAL in the shop process.

## Skills for this use-case

| Skill | Why |
| ----- | --- |
| `sw-php-foundation` | Shared strict PHP 8.x base (for any external backend code you write). |
| `sw-app-development` | Manifest, permissions, app scripts, webhooks, Admin API, Meteor Admin SDK. |
| `sw-security` | App secrets, least-privilege manifest, webhook verification. |
| `sw-research-and-escalation` | Verify against installed source; escalate instead of guessing. |
| `sw-review-learnings` | Recurring real-world findings. |
| `sw-change-impact` | After a feature works: blast radius, who pays, easier vs more complex. |

## Install (one-liner)

```bash
# Cursor (use -a claude-code, -a codex or -a opencode for the other tools)
npx skills add BrocksiNet/ai-skills-shopware \
  --skill sw-php-foundation \
  --skill sw-app-development \
  --skill sw-security \
  --skill sw-research-and-escalation \
  --skill sw-review-learnings \
  --skill sw-change-impact \
  -a claude-code -a codex -a cursor
```

Install at **project level** (the default) so the version pin stays per-project
and reproducible for the team; `-g` installs user-level (all projects) but is
then global and effectively unpinned. Pin a version with
`BrocksiNet/ai-skills-shopware@vX.Y.Z`.

## Mixing use-cases

`sw-app-development` (declarative manifest + sandboxed app scripts +
external backend) and `sw-plugin-development` (PHP: DI, DAL, decoration,
migrations) are different surfaces and route by target (`custom/apps` +
`manifest.xml` vs `custom/plugins`). If you build both, add the skills from
[`plugin-development.md`](plugin-development.md) too; they coexist safely.
Add [`storefront-development.md`](storefront-development.md) when the app also
ships a **theme** or an **Administration Vue/TS** extension. Manifest-declared
Meteor Admin SDK modules (iframe / action button) stay on this app skill.
