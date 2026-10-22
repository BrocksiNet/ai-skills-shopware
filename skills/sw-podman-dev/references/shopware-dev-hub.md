# shopware-dev hub reference

Personal central config at `~/shopware-dev`. Linked Shopware checkouts consume
it via `sw-dev link` — no per-project `compose.override.yaml` or MCP JSON to
duplicate.

**Skills** live in `ai-skills-shopware/skills/` (this repo). `instances.json`
lists which skills to symlink; `skills_source` points at that folder. Optional
`sw-podman-dev` — omit from `"skills"` if you do not use Podman.

## What `sw-dev link` does

1. Writes `COMPOSE_FILE` block in project `.env` (compose.yaml + shared +
   instance overrides from `~/shopware-dev`).
2. Backs up local `compose.override.yaml` → `compose.override.yaml.bak.shopware-dev`.
3. Symlinks MCP configs from `~/shopware-dev/linked/<instance>/`:
   - `.mcp-php-tooling.json`
   - `.mcp-js-tooling.json`
   - `.mcp-gh-tooling.json`
   - `.lsp-php-tooling.json`
4. Overlays skills from `skills_source` into `.cursor/skills/` and
   `.codex/skills/`. `.agents/skills/` is overlaid only when that skill name is
   not git-tracked. `.claude/skills` is skipped when it is a symlink onto
   `.agents/skills` (core trunk / 6.7 / 6.8). Never replace core's tracked
   `sw-admin-js` (that deletes `SKILL.md` and `agents/openai.yaml` in
   `git status`).

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

## OpenSearch (opt-in per lane)

`overrides/shared.podman-mutagen.yaml` puts the upstream `opensearch` service
behind the compose profile `opensearch`, so lanes start **without** it. Shopware
then searches via MySQL. Seven idle OpenSearch containers (1 GB heap each)
exhausted the 16 GB Podman VM and OOM-killed admin builds, so keep it off
unless the task needs it.

The task needs it when any of these hold:

- `SHOPWARE_ES_ENABLED` or `SHOPWARE_ADMIN_ES_ENABLED` is (or must be) true
- you run `es:*` console commands, touch `src/Elasticsearch/`, or run tests
  under `tests/integration/Elasticsearch/`
- the bug only reproduces with OpenSearch (search, listing, admin search)

Enable it for **this workspace's lane only**:

1. Persist the profile: add `COMPOSE_PROFILES=opensearch` to the project `.env`
   **below** the `# --- /shopware-dev ---` marker. `sw-dev link` keeps lines
   outside its block, and `sw-dev startup` then starts OpenSearch too.
2. Persist the Shopware flags in `~/shopware-dev/instances/<lane>.yaml` under
   `services.web.environment`: `SHOPWARE_ES_ENABLED: '1'`,
   `SHOPWARE_ES_INDEXING_ENABLED: '1'`, plus `SHOPWARE_ADMIN_ES_ENABLED: '1'`
   for admin search. `OPENSEARCH_URL` / `ADMIN_OPENSEARCH_URL`
   (`http://opensearch:9200`) are already set by the upstream compose file.
3. Apply and index from the project root:

   ```bash
   podman compose up -d
   podman compose exec web bin/console es:status
   podman compose exec web bin/console es:index --no-queue
   podman compose exec web bin/console es:admin:index --no-queue  # admin search
   ```

One-off (server only, no flags, nothing persisted):
`podman compose --profile opensearch up -d opensearch`.

Disable: remove the `.env` line and the flags, then
`podman compose --profile opensearch stop opensearch` and `podman compose up -d`.
Do not enable it on lanes the task does not touch, and tell the user when you
leave it running.

## MCP defaults (central)

- `enforce_mcp_tools: false` — MCP is optional; `podman compose exec` must always be allowed
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
