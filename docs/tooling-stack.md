# Tooling stack: ai-skills-shopware vs shopware-ai-coding-tools

Guide for **personal / multi-instance** setups (proxy, several Shopware URLs,
not every MCP server available to every model).

## The problem

[shopware-ai-coding-tools](https://github.com/shopwareLabs/ai-coding-tools) bundles:

| Piece | What it does | MCP? |
| ----- | ------------ | ---- |
| dev-tooling | phpstan, ecs, phpunit, console, eslint, jest | Yes (php / js-admin / js-storefront) |
| gh-tooling | PR, issues, CI logs | Yes |
| test-writing | UNIT-* rules, test generator/reviewer agents | Yes (test-rules) + heavy skills |
| contributor-writing | PR descriptions, ADRs, release notes | Skills only |
| chunkhound | Semantic code search | Yes |

Hooks can **enforce** MCP usage (`enforce_mcp_tools: true` in
`.mcp-php-tooling.json`). That breaks when:

- A model/agent has no MCP access (CLI, cloud, subagent).
- php-tooling cannot reach the right container (wrong compose project, proxy host).
- Only **one** Shopware HTTP MCP instance should be active per workspace.
- test-writing skills expect test-rules + phpunit MCP in a fixed loop.

## Recommendation: lean personal stack

**Keep skills portable. Keep MCP minimal. Drop enforcement when it fights you.**

### Layer 1 — Always (no MCP)

Install from this repo:

```bash
npx skills add BrocksiNet/ai-skills-shopware \
  --skill php-foundation \
  --skill shopware-core-development \
  --skill shopware-testing \
  --skill shopware-research-and-escalation \
  --skill shopware-review-learnings \
  --skill shopware-pr-description \
  --skill shopware-pr-review \
  --skill shopware-assistant-style \
  --skill shopware-podman-dev \
  -a cursor
```

`shopware-podman-dev` tells every model to use **Podman/MCP**, not host
`php`/`composer`/`phpunit`, when the checkout is linked via `~/shopware-dev`.

If you use the `~/shopware-dev` hub, you do **not** need `npx skills add` per
project — `sw-dev link` symlinks skills from **this repo's** `skills/` into
`.cursor/`, `.claude/`, `.codex/`, and `.agents/` for all three tools. Omit
`shopware-podman-dev` from `instances.json` if you do not use Podman.

Optional plugin work:

```bash
npx skills add FriendsOfShopware/agent-skills --skill shopware-phpunit -a cursor
```

These work in **any** agent that loads skills — no docker, no proxy, no MCP.

### Layer 2 — Project MCP (pick per repo)

**shopware-trunk** example (proxy + Docker):

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

```json
// .mcp-php-tooling.json
{
  "environment": "docker-compose",
  "docker-compose": { "service": "web", "workdir": "/var/www/html" },
  "enforce_mcp_tools": false
}
```

Set `enforce_mcp_tools: false` so agents can fall back to
`docker compose exec web …` when php-tooling MCP is missing.

Enable **only** the dev-tooling + gh-tooling plugin MCP servers you actually use.
Skip js-admin / js-storefront if you are not touching those trees in that session.

### Layer 3 — Optional (heavy)

| Add when… | Skip when… |
| --------- | ---------- |
| test-writing plugin + phpunit-unit-test-writing skill | You only need `shopware-testing` + manual phpunit runs |
| chunkhound | ripgrep + LSP is enough |
| contributor-writing skills in plugin | You already have `shopware-pr-description` + `shopware-core-development` |

## Fix the plugin vs replace it

| Approach | Pros | Cons |
| -------- | ---- | ---- |
| **Lean subset (recommended)** | Predictable; skills work everywhere; one Shopware URL per project | No auto test-review loop; you run phpunit yourself |
| **Fix upstream** | Team-aligned; full test-writing pipeline | Needs shopwareLabs changes for proxy multi-instance, optional MCP, `enforce_mcp_tools` soft-fail |

Worth upstreaming if you stay on the plugin:

1. `enforce_mcp_tools: false` as default for non-CI dev.
2. Per-server enable flags in `.mcp-php-tooling.json`.
3. HTTP MCP base URL from env (e.g. `SHOPWARE_MCP_URL`) per instance.
4. Skills that do not hard-require test-rules MCP when phpunit MCP works.

## Multi-instance proxy pattern

- **One Cursor workspace per Shopware instance** (trunk vs commercial vs mysql84).
- Each workspace: its own `.mcp.json` URL (`trunk.localhost:8088`, `commercial.localhost:…`).
- **Do not** register multiple Shopware HTTP MCP servers in one workspace unless
  the agent can disambiguate — most cannot.
- User-level `~/.cursor/mcp.json` Shopware entry: remove or point at a default;
  let **project** `.mcp.json` win per repo.

## Quick decision

```text
Need auto-generated unit tests with 20+ UNIT-* rule reviews?
  → keep test-writing plugin + php-tooling MCP

Mostly core contribution, PR reviews, manual phpunit?
  → ai-skills-shopware + php-tooling (no enforce) + gh-tooling
  → drop test-writing plugin hooks
```
