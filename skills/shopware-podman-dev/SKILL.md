---
name: shopware-podman-dev
description: >-
  Run Shopware dev commands inside Podman, never on the host. Use when working
  in a linked shopware-dev checkout (shopware-trunk, shopware-6-6-branch,
  shopware-commercial, etc.): php, composer, phpunit, bin/console, phpstan, ecs,
  npm, node, or "run tests". Triggers on "composer install", "run phpunit",
  "phpstan", "bin/console", "podman compose", "shopware-dev", "use the
  container", "mutagen", "trunk.localhost". Do NOT use for CI log interpretation,
  PR descriptions, or PHPUnit test structure rules (shopware-testing).
---

# Shopware Podman dev environment

Shopware runs in **Podman** with **Mutagen** sync. Host PHP/Composer/PHPUnit/Node
are wrong for linked projects — code and `vendor/` live in the container volume.

## Hard rules (refuse host execution)

1. **Never** run `php`, `composer`, `phpunit`, `bin/console`, `phpstan`,
   `ecs`, `rector`, or Shopware `npm`/`node` scripts on the **host** for a
   linked project unless the user explicitly says native/no-container.
2. **Never** assume `vendor/`, `var/`, or `node_modules/` on the host are
   current — Mutagen syncs into the container named volume.
3. **Always** `cd` to the **project root** (where `compose.yaml` lives) before
   compose/MCP commands so `.env` `COMPOSE_FILE` and MCP configs apply.

## Command priority

Use the **first** option that works in the session:

| Priority | How | When |
| -------- | --- | ---- |
| 1 | **MCP dev-tooling** | `phpstan_analyze`, `ecs_check`, `phpunit_run`, `console_run`, js-admin/storefront lint tools |
| 2 | **`podman compose exec web …`** | MCP missing, subagent without MCP, or one-off shell |
| 3 | Host CLI | Only if user confirms native setup |

MCP configs are symlinked from `~/shopware-dev` (`.mcp-php-tooling.json`, etc.).
They target compose service `web`, workdir `/var/www/html`.

## Detect a linked project

A project is **shopware-dev linked** when `.env` contains:

```dotenv
# --- shopware-dev (managed by sw-dev) ---
```

Then overrides come from `~/shopware-dev/`, not local `compose.override.yaml`.

Quick check:

```bash
grep -F 'shopware-dev (managed by sw-dev)' .env && sw-dev show <instance>
```

(`sw-dev` lives at `~/shopware-dev/bin/sw-dev`.)

**Optional skill** in [ai-skills-shopware](https://github.com/BrocksiNet/ai-skills-shopware) —
skip it if you do not use Podman/Mutagen. With `~/shopware-dev`, `sw-dev link`
symlinks skills from `ai-skills-shopware/skills/` into `.agents/skills/` and
`.claude/skills/` so Claude Code, Codex, and Cursor share one source.

## Shell patterns (MCP fallback)

From project root:

```bash
# PHP / Composer / Console
podman compose exec web composer install
podman compose exec web bin/console cache:clear
podman compose exec web vendor/bin/phpunit --filter MyTest

# Quality tools (prefer MCP when available)
podman compose exec web composer phpstan
podman compose exec web composer ecs

# Administration JS (scope admin in .mcp-js-tooling.json)
podman compose exec web bash -lc 'cd src/Administration/Resources/app/administration && npm run lint'

# Storefront JS
podman compose exec web bash -lc 'cd src/Storefront/Resources/app/storefront && npm run lint'
```

Use `podman compose` (not bare `docker`). Do **not** pass `-f compose.override.yaml`
unless debugging — linked projects use `COMPOSE_FILE` in `.env`.

## Multi-instance lanes

Several checkouts run in parallel. **Use the workspace's project** — do not
cross lanes.

| Instance | Proxy (browser / HTTP MCP) | App port |
| -------- | -------------------------- | -------- |
| trunk | `http://trunk.localhost:8088` | 8100 |
| sw66 | `http://sw66.localhost:8088` | 8101 |
| sw65 | `http://sw65.localhost:8088` | 8102 |

`.mcp.json` Shopware HTTP URL must match **this** workspace's lane.

## Before running tools

1. Container up: `podman compose up -d` (from project root).
2. Mutagen: sessions should be watching (`mutagen sync list`). After reboot:
   `sw-dev startup` (or `~/shopware-dev/bin/sw-dev startup`). The old
   `~/scripts/dev-startup.sh` path is only a compatibility wrapper.
3. After changing `~/shopware-dev` overrides: `sw-dev link-all`, then
   `podman compose up -d --force-recreate web` if volumes/ports changed.

## shopware-dev commands

`~/shopware-dev/bin/sw-dev` is the source of truth for local orchestration:

```bash
sw-dev startup --quiet       # GPG, phpactor, Podman, proxy, Mutagen
sw-dev sync all              # all lane and non-agentic Mutagen sessions
sw-dev sync status           # lane Mutagen/container file status
sw-dev proxy restart         # reload local trunk/sw66/sw65 proxy
sw-dev lane shell trunk      # open shell in the lane's web container
sw-dev lane exec 66 bin/console cache:clear
sw-dev agentic bootstrap 65
sw-dev agentic qa trunk ci
sw-dev agentic matrix --with-qa
sw-dev agentic seed trunk music
```

Compatibility wrappers remain under `~/scripts/dev-startup.sh` and
`~/scripts/agentic-commerce/*`, but new instructions should prefer `sw-dev`.

## Validate shopware-dev

```bash
sw-dev doctor              # links, symlinks, override files exist
sw-dev validate trunk      # + compose merge + container exec + proxy + mutagen
sw-dev validate --static-only   # no podman exec / no HTTP
```

## Common mistakes

| Wrong | Right |
| ----- | ----- |
| `php bin/console …` on host | `podman compose exec web bin/console …` |
| `composer install` on host | `podman compose exec web composer install` |
| `./vendor/bin/phpunit` on host | MCP `phpunit_run` or exec in `web` |
| Read host `vendor/` for symbols | Search source or use LSP/MCP in container |
| Edit `compose.override.yaml` in project | Edit `~/shopware-dev/instances/*.yaml` |

## Hub layout (edit once)

```text
~/shopware-dev/
  instances.json
  overrides/shared.podman-mutagen.yaml
  instances/trunk.yaml, sw66.yaml, …
  tooling/mcp-*.base.json
  proxy/dev_host_proxy.py
  lib/startup.sh, lib/mutagen.sh, lib/agentic.sh, …
  bin/sw-dev
```

Details: [`references/shopware-dev-hub.md`](references/shopware-dev-hub.md)
