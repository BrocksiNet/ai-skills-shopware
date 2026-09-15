# Tooling stack: skills, Shopware CLI, MCP

Guide for **personal / multi-instance** setups (proxy, several Shopware URLs,
not every MCP server available to every model).

## Layers

**Keep skills portable. Keep MCP optional. Never let hooks block a fallback.**

### Layer 1 — Always (no MCP)

Install from this repo (profiles in [`skill-resolution.md`](skill-resolution.md)):

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
  -a cursor
```

`shopware-podman-dev` picks the runner: **Podman** on a linked `~/shopware-dev`
tree, **shopware-cli** when `.shopware-project.yml` exists.

If you use the `~/shopware-dev` hub, you do **not** need `npx skills add` per
project — `sw-dev link` symlinks skills from **this repo's** `skills/` into
`.cursor/`, `.claude/`, `.codex/`, and `.agents/`. Omit `shopware-podman-dev`
from `instances.json` if you do not use Podman.

Install the CLI's own skills next to ours (do not copy them into this repo):

```bash
npx skills add shopware/shopware-cli
```

Optional plugin PHPUnit extras:

```bash
npx skills add FriendsOfShopware/agent-skills --skill shopware-phpunit -a cursor
```

These work in **any** agent that loads skills — no docker, no proxy, no MCP.

### Layer 2 — Execution (pick per repo)

| Detect | Runner |
| ------ | ------ |
| Linked shopware-dev (`.env` marker) | `podman compose exec web …` |
| `.shopware-project.yml` (not shopware-dev) | `shopware-cli project console` / `project validate` / `extension validate` |
| Shopware HTTP MCP | **One** URL per workspace for shop data (Admin/Store API), not phpstan |

**shopware-trunk** HTTP MCP example (proxy + container):

```json
// .mcp.json — ONE Shopware HTTP endpoint for this workspace
{
  "mcpServers": {
    "shopware": {
      "type": "http",
      "url": "http://trunk.localhost:8088/api/_mcp",
      "headers": { "sw-access-key": "…", "sw-secret-access-key": "…" }
    }
  }
}
```

php-tooling MCP (phpstan/phpunit/console) is optional. If you keep it:

```json
// .mcp-php-tooling.json
{
  "environment": "docker-compose",
  "docker-compose": { "service": "web", "workdir": "/var/www/html" },
  "enforce_mcp_tools": false
}
```

`enforce_mcp_tools` must stay **false**. PreToolUse hooks that exit 2 block
`vendor/bin/phpunit`, `bin/console`, composer, and `shopware-cli` when MCP is
down, which breaks Cursor, Codex, cloud agents, and subagents.

### Layer 3 — Optional (heavy)

[shopwareLabs/ai-coding-tools](https://github.com/shopwareLabs/ai-coding-tools)
is a **Claude Code plugin marketplace**, not a portable skill library. Hooks
default to `enforce_mcp_tools: true`. Prefer uninstalling hook-bearing plugins
over porting their MCP servers into this repo.

| Piece | Keep? |
| ----- | ----- |
| `dev-tooling` / `shopware-env` PreToolUse blockers | Uninstall (or `enforce_mcp_tools: false`) |
| Cached `gh-tooling` (moved to shopwareLabs/github-agent-tools) | Uninstall; same bash-block pattern |
| `test-writing` auto-review loop | Only if you want that generator; needs MCP |
| Skills-only plugins (contributor-writing, code-migration) | Optional; mine rules here instead of copying |
| chunkhound | Skip when ripgrep + LSP is enough |
| [Modern Web Guidance](https://github.com/GoogleChrome/modern-web-guidance) CLI | Generic CSS/HTML/JS after Shopware primitives. Do **not** install their `SKILL.md` next to ours. `DISABLE_TELEMETRY=1`. |

Do **not** reimplement php-tooling MCP here. Core already has HTTP MCP;
`shopware-cli` is the planned connector; Podman/`project console` already run
phpstan, phpunit, and console.

A small upstream patch (fail-open when MCP is missing; allow `shopware-cli` and
`compose exec`) is optional and not required to use this library.

## Multi-instance proxy pattern

- **One Cursor workspace per Shopware instance** (trunk vs commercial vs mysql84).
- Each workspace: its own `.mcp.json` URL (`trunk.localhost:8088`, `commercial.localhost:…`).
- **Do not** register multiple Shopware HTTP MCP servers in one workspace unless
  the agent can disambiguate — most cannot.
- User-level `~/.cursor/mcp.json` Shopware entry: remove or point at a default;
  let **project** `.mcp.json` win per repo.

## Quick decision

```text
Linked ~/shopware-dev checkout?
  → this repo + Podman (MCP optional, never enforced)

.shopware-project.yml / extension validate?
  → this repo + npx skills add shopware/shopware-cli

Need auto-generated unit tests with 20+ UNIT-* rule reviews?
  → test-writing plugin, with hooks off

Mostly core contribution, PR reviews, manual phpunit?
  → this repo + Podman or shopware-cli; skip ai-coding-tools hooks
```
