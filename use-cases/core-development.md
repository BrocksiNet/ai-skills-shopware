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
| `shopware-architecture` | Refactor decisions, progressive enhancement, DAL anti-patterns |
| `shopware-security` | Secrets, ACL — not in core skills |
| `shopware-research-and-escalation` | Verify against installed source |
| `shopware-review-learnings` | Recurring review deltas |
| `shopware-pr-review` | GitHub review thread triage |
| `shopware-podman-dev` | Podman/MCP execution |

Add `shopware-plugin-development` when editing `custom/plugins` in the monorepo.

```bash
npx skills add BrocksiNet/ai-skills-shopware \
  --skill shopware-architecture \
  --skill shopware-security \
  --skill shopware-research-and-escalation \
  --skill shopware-review-learnings \
  --skill shopware-pr-review \
  --skill shopware-podman-dev \
  -a claude-code -a codex -a cursor
```

## Non-trunk core (6.5 / 6.6 / no in-repo skills)

Full platform skill set — core in-repo skills are **not** present:

| Skill | Why |
| ----- | --- |
| `php-foundation` | Shared strict PHP 8.x base. |
| `shopware-architecture` | Patterns, progressive enhancement, DAL boundaries. |
| `shopware-security` | Secrets and ACL. |
| `shopware-core-development` | Deprecations, release notes, PHPStan baseline. |
| `shopware-testing` | PHPUnit standards. |
| `shopware-research-and-escalation` | Research ladder. |
| `shopware-review-learnings` | Recurring findings. |
| `shopware-pr-description` | GitHub PR body for shopware/shopware. |
| `shopware-assistant-style` | Communication style. |
| `shopware-pr-review` | Review comment triage. |
| `shopware-podman-dev` | Podman/MCP execution. |

```bash
npx skills add BrocksiNet/ai-skills-shopware \
  --skill php-foundation \
  --skill shopware-architecture \
  --skill shopware-security \
  --skill shopware-core-development \
  --skill shopware-testing \
  --skill shopware-research-and-escalation \
  --skill shopware-review-learnings \
  --skill shopware-pr-description \
  --skill shopware-assistant-style \
  --skill shopware-pr-review \
  --skill shopware-podman-dev \
  -a claude-code -a codex -a cursor
```

Install at **project level** (the default). Pin with `BrocksiNet/ai-skills-shopware@vX.Y.Z`.

## Mixing use-cases

Surface skills route by path. Add [`plugin-development.md`](plugin-development.md)
when you also build extensions.
