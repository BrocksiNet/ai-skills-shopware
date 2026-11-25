# Use-case: plugin / project development

For building PHP extensions on top of Shopware 6: plugins under `custom/plugins`
and customer-project code. In-repo core skills are usually **absent** — use the
**full** profile from [`docs/skill-resolution.md`](../docs/skill-resolution.md).

## Skills for this use-case

| Skill | Why |
| ----- | --- |
| `sw-php-foundation` | Shared strict PHP 8.x base. |
| `sw-architecture` | DAL boundaries, extension mechanisms, thin controllers. |
| `sw-security` | Access keys, ACL, safe API exposure. |
| `sw-plugin-development` | DAL, cache tags, migrations, decoration, 6.6/6.7 compat, OpenAPI. |
| `sw-mcp-development` | MCP tools, prompts, and resources in plugins (experimental, 6.7.15+ / 6.8.0). |
| `sw-testing` | PHPUnit unit/integration standards. |
| `sw-research-and-escalation` | Verify against installed source. |
| `sw-review-learnings` | Recurring real-world findings. |
| `sw-change-impact` | After a feature works: blast radius, who pays, easier vs more complex. |
| `sw-skill-router` | Lists the skills and references a diff or plan needs (`/sw-skill-router`). |
| `sw-help` | What every skill is for, with example prompts (`/sw-help`). |

## Install (one-liner)

```bash
npx skills add BrocksiNet/ai-skills-shopware \
  --skill sw-skill-router \
  --skill sw-help \
  --skill sw-php-foundation \
  --skill sw-architecture \
  --skill sw-security \
  --skill sw-plugin-development \
  --skill sw-mcp-development \
  --skill sw-testing \
  --skill sw-research-and-escalation \
  --skill sw-review-learnings \
  --skill sw-change-impact \
  -a claude-code -a codex -a cursor
```

Install at **project level** (the default). Pin with `BrocksiNet/ai-skills-shopware@vX.Y.Z`.

For project create/validate/package workflows, also install Shopware CLI skills
(do not copy them into this repo):

```bash
npx skills add shopware/shopware-cli
```

## Mixing use-cases

Surface skills route by what you edit. Add [`core-development.md`](core-development.md)
for platform work; [`app-development.md`](app-development.md) for declarative apps;
[`storefront-development.md`](storefront-development.md) for Twig/theme/Admin JS.

## Optional: hook-driven activation (Claude Code)

To inject matched skills, references, and active rule IDs automatically as the
diff changes (and stay silent when the matched set is unchanged), add a
`UserPromptSubmit` hook running `route.mjs --hook --task build` in
`.claude/settings.json`. Only once that hook is wired, optionally set the
non-router `sw-*` skills to `"name-only"` via `skillOverrides` — never enable
`"name-only"` without the hook. Full JSON snippets:
[`docs/installation.md#automatic-routing-hook-claude-code`](../docs/installation.md#automatic-routing-hook-claude-code).
