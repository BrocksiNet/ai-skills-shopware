# shopware-dev hub reference

Personal central config at `~/shopware-dev`. Linked Shopware checkouts consume
it via `sw-dev link` — no per-project `compose.override.yaml` or MCP JSON to
duplicate.

**Skills** live in `ai-skills-shopware/skills/` (this repo). `instances.json`
lists which skills to symlink; `skills_source` points at that folder. List
`sw-local-dev` there for the execution rules.

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
   `shopware-admin-js` (that deletes `SKILL.md` and `agents/openai.yaml` in
   `git status`).

## Commands

```bash
sw-dev list
sw-dev show trunk
sw-dev link <instance> [path]
sw-dev link-all
sw-dev doctor
sw-dev unlink <instance>
sw-dev versions
sw-dev lane create|update|remove <instance> …
sw-dev space [--host]
sw-dev prune [--apply] [--unused-images] [--sessions]
sw-dev ext status|sync|adopt|reset <lane>
```

## Instances

`sw-dev list` prints the registry. `trunk` at
`~/Documents/Projects/shopware-trunk` (`trunk.localhost:8088`) is permanent and
tracks the next unreleased major. Lanes made by `sw-dev lane create` live at
`~/Documents/Projects/shopware-<id>` and are served at `<id>.localhost:8088`.

## Mutagen

Each lane's host checkout syncs into its container with a `two-way-resolved`
Mutagen session named `shopware-<lane>`. `sw-dev startup` and `sw-dev sync all`
recreate missing sessions after a reboot. `vendor/` and `composer.lock` are
Mutagen-ignored, so the container owns them. Because `composer.lock` is also
git-ignored, `sw-dev lane update` falls back to `composer update` when the lock
does not match the new ref.

The source volume is mounted without SELinux relabeling. A file written by a
different container keeps that container's private label (`container_file_t:s0:cX,cY`)
and a recreated web container gets `Permission denied` on it even as the same
uid. `sw-dev lane update` and `lane create` reset such files to `s0` before
provisioning. To check by hand, run `sudo find <volume> -context '*:s0:c*'`
inside `podman machine ssh`.

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

Run `sw-dev lane create <id> --ref <tag|branch> --plan`, check the plan, then
run it without `--plan`. To retire a lane, run `sw-dev lane remove <id>` as a
dry run, show the user the output, and add `--yes` only after they agree.
