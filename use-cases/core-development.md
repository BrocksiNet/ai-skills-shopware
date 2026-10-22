# Use-case: platform / core contribution

For changing the Shopware **platform** itself (`shopware/shopware`, `shopware-core`
packages, first-party bundles under `src/`).

See [`docs/skill-resolution.md`](../docs/skill-resolution.md) for **trunk overlay**
vs **full** install when in-repo core skills are absent (6.5/6.6 branches).

## Trunk (`shopware/shopware` with `.agents/skills/`)

Core ships `shopware-php-code`, `shopware-phpunit-tests`, `shopware-pr-hygiene`,
etc. Install **delta overlay** from this repo:

| Skill | Why |
| ----- | --- |
| `sw-architecture` | Refactor decisions, progressive enhancement, DAL anti-patterns |
| `sw-security` | Secrets, ACL — not in core skills |
| `sw-research-and-escalation` | Verify against installed source |
| `sw-review-learnings` | Recurring review deltas |
| `sw-change-impact` | After a feature works: blast radius before ship |
| `sw-pr-review` | GitHub review thread triage |
| `sw-podman-dev` | Podman/MCP execution |

Add `sw-plugin-development` when editing `custom/plugins` in the monorepo.

```bash
npx skills add BrocksiNet/ai-skills-shopware \
  --skill sw-architecture \
  --skill sw-security \
  --skill sw-research-and-escalation \
  --skill sw-review-learnings \
  --skill sw-change-impact \
  --skill sw-pr-review \
  --skill sw-podman-dev \
  -a claude-code -a codex -a cursor
```

## Non-trunk core (6.5 / 6.6 / no in-repo skills)

Full platform skill set — core in-repo skills are **not** present:

| Skill | Why |
| ----- | --- |
| `sw-php-foundation` | Shared strict PHP 8.x base. |
| `sw-architecture` | Patterns, progressive enhancement, DAL boundaries. |
| `sw-security` | Secrets and ACL. |
| `sw-core-development` | Deprecations, release notes, PHPStan baseline. |
| `sw-testing` | PHPUnit standards. |
| `sw-research-and-escalation` | Research ladder. |
| `sw-review-learnings` | Recurring findings. |
| `sw-change-impact` | After a feature works: blast radius before ship. |
| `sw-pr-description` | GitHub PR body for shopware/shopware. |
| `sw-assistant-style` | Communication style. |
| `sw-pr-review` | Review comment triage. |
| `sw-podman-dev` | Podman/MCP execution. |

```bash
npx skills add BrocksiNet/ai-skills-shopware \
  --skill sw-php-foundation \
  --skill sw-architecture \
  --skill sw-security \
  --skill sw-core-development \
  --skill sw-testing \
  --skill sw-research-and-escalation \
  --skill sw-review-learnings \
  --skill sw-change-impact \
  --skill sw-pr-description \
  --skill sw-assistant-style \
  --skill sw-pr-review \
  --skill sw-podman-dev \
  -a claude-code -a codex -a cursor
```

Install at **project level** (the default). Pin with `BrocksiNet/ai-skills-shopware@vX.Y.Z`.

## Mixing use-cases

Surface skills route by path. Add [`plugin-development.md`](plugin-development.md)
when you also build extensions;
[`storefront-development.md`](storefront-development.md) for Twig/theme/Admin JS.
