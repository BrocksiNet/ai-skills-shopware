# shopware-dev hub reference

Personal central config at `~/shopware-dev`. Linked Shopware checkouts consume
it via `sw-dev link` — no per-project `compose.override.yaml` or MCP JSON to
duplicate.

**Skills** live in `ai-skills-shopware/skills/` (this repo). `instances.json`
lists which skills to symlink; `skills_source` points at that folder. Optional
`shopware-podman-dev` — omit from `"skills"` if you do not use Podman.

## What `sw-dev link` does

1. Writes `COMPOSE_FILE` block in project `.env` (compose.yaml + shared +
   instance overrides from `~/shopware-dev`).
2. Backs up local `compose.override.yaml` → `compose.override.yaml.bak.shopware-dev`.
3. Symlinks MCP configs from `~/shopware-dev/linked/<instance>/`:
   - `.mcp-php-tooling.json`
   - `.mcp-js-tooling.json`
   - `.mcp-gh-tooling.json`
   - `.lsp-php-tooling.json`

## Commands

```bash
sw-dev list
sw-dev show trunk
sw-dev link <instance> [path]
sw-dev link-all
sw-dev doctor
sw-dev unlink <instance>
```

## Instances (default registry)

| ID | Path | Proxy |
| -- | ---- | ----- |
| trunk | `~/Documents/Projects/shopware-trunk` | trunk.localhost:8088 |
| sw66 | `~/Documents/Projects/shopware-6-6-branch` | sw66.localhost:8088 |
| sw65 | `~/Documents/Projects/shopware-6-5-branch` | sw65.localhost:8088 |
| commercial | `~/Documents/Projects/shopware-commercial` | (base compose ports) |

## Mutagen

Host directory syncs into container volume `shopware-src` via Mutagen.
`~/scripts/dev-startup.sh` ensures lane + commercial sessions after reboot.

## MCP defaults (central)

- `enforce_mcp_tools: false` — MCP preferred, `podman compose exec` allowed
- PHP: docker-compose `web`, PHPStan memory 2G, ECS `.php-cs-fixer.dist.php`
- JS: admin + storefront scopes under `src/.../administration` and `storefront`
- GH: default `shopware/shopware` (trunk patch: `lacknere/shopware`)
- LSP: phpactor at `/usr/local/bin/phpactor.phar` (compose volume mount)

## Still per workspace

- `.mcp.json` — Shopware HTTP MCP URL + API keys (one lane per Cursor workspace)

## New checkout

1. Clone Shopware into `~/Documents/Projects/…`
2. Add entry to `~/shopware-dev/instances.json` + `instances/<name>.yaml`
3. `sw-dev link <name>`
4. `podman compose up -d` + mutagen session (or `dev-startup.sh`)
