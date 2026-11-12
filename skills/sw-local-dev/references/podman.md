# Podman and Mutagen (linked shopware-dev lanes)

A personal setup: `~/shopware-dev` links Shopware checkouts ("lanes") to a
shared Podman stack, and Mutagen syncs the code into a container volume.
Host `vendor/`, `var/` and `node_modules/` are not what the container runs.

## Rules for linked lanes

- **DEV-006** In a linked shopware-dev lane, run PHP tools through
  `podman compose exec web`, never on the host, never through `docker`, and
  without a hand-picked `-f` compose file: `COMPOSE_FILE` in `.env` wins.
- Never `composer require` private extensions (agentic commerce, UCP SDK,
  MCP extensions) into a lane's tracked `composer.json`. Use `sw-dev ext sync
  <lane>`, which wires them through the git-excluded `composer.sw-dev.json`.
- Never remove a lane, a lane volume or a checkout without the user's
  go-ahead. `trunk` is permanent. Run `sw-dev lane remove` and `sw-dev prune`
  as a dry run first and show the user what they would delete.
- Do not route a linked lane through `shopware-cli` (Docker vs Podman
  mismatch) or bare `docker`.

MCP configs for linked projects are symlinked from `~/shopware-dev`
(`.mcp-php-tooling.json`, etc.). They target compose service `web`, workdir
`/var/www/html`. Use MCP `phpunit_run` and the like when they are actually
callable, else `podman compose exec web …`. Set `enforce_mcp_tools: false` if
that plugin is installed so hooks cannot veto Podman or `shopware-cli`.

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

With `~/shopware-dev`, `sw-dev link` symlinks skills from
`ai-skills-shopware/skills/` into `.agents/skills/` and `.claude/skills/` so
Claude Code, Codex, and Cursor share one source.

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

Each lane is reachable at `http://<instance>.localhost:8088` through the shared
proxy. `sw-dev list` shows the lanes, `sw-dev show <instance>` the path and app
port. `trunk` always tracks the next unreleased major. The other lanes pin a
release tag or a branch.

`.mcp.json` Shopware HTTP URL must match **this** workspace's lane.

## Lane lifecycle

Use the `sw-dev lane` commands instead of editing `instances.json` by hand:

```bash
sw-dev versions                                  # each lane vs the latest tag of its line
sw-dev lane create sw6716 --ref v6.7.16.0 --plan # dry run: lane, path, ports
sw-dev lane create sw6716 --ref v6.7.16.0        # clone, register, link, install, build
sw-dev lane update sw67 --ref v6.7.16.0          # new tag, migrations, rebuild
sw-dev lane remove sw65                          # dry run
sw-dev lane remove sw65 --yes                    # containers, volumes, sessions, registry
```

`lane create` picks free ports, writes `instances/<id>.yaml`, links the
checkout, starts the stack and the Mutagen session, then installs and builds
inside the container. `--no-install` and `--no-build` stop earlier. `lane
update` refuses a dirty checkout, except for old extension wiring in
`composer.json`, which it moves into the overlay. `composer.lock` is git-ignored
upstream and goes stale on every ref change, so a failing `composer install`
falls back to `composer update`. The Mutagen flush is retried for about three
minutes while the recreated web container starts. Before provisioning, files
in the source volume that still carry another container's private SELinux label
are reset to the shared label; otherwise steps like `feature:dump` fail with
`Permission denied` although owner and mode look right. Only lanes listed in an
`agentic_commerce` or `mcp_extensions` lane order get extensions re-wired at the
end. `lane remove` deletes the lane database and keeps the checkout unless you
pass `--delete-checkout`.

## Disk space

The Podman VM disk fills up first. Check it before large builds:

```bash
sw-dev space                 # VM disk, podman system df, volumes per lane
sw-dev prune                 # dry run: orphaned containers, volumes, images, sessions
sw-dev prune --apply         # remove them; add --unused-images or --sessions for more
```

Do not run `podman system prune` or `podman volume prune`. After a `compose
down`, a lane's volumes belong to no container, so these commands delete the
lane database too. `sw-dev prune` keeps the volumes of every registered lane.

## composer.json stays clean

`sw-dev agentic bootstrap` and `sw-dev mcp bootstrap` run their `composer
config` and `composer require` with `COMPOSER=composer.sw-dev.json`. The
tracked `composer.json` therefore shows no diff.

```bash
sw-dev ext status trunk   # composer.json clean? overlay present or stale?
sw-dev ext sync trunk     # rebuild the overlay and re-wire the extensions
sw-dev ext adopt trunk    # move an old composer.json diff into the overlay
```

A plain `composer install` uses `composer.json` and drops the extensions from
`vendor/`. Run `sw-dev ext sync <lane>` after it.

Lanes always link the local ucp-php-sdk checkout, normally `main`. When the
plugin still pins an older exact SDK release, the overlay registers the SDK
under that pin and aliases it as the newest SDK tag, for example
`0.0.7 as 0.0.8`. The plugin's version guard passes and the linked code is
still `main`. `UCP_SDK_VERSION` overrides the newest-tag lookup.

## Fresh-clone traps

A bare `shopware/shopware` clone ships **no built assets and no `install.lock`**.
`sw-dev lane create` handles these traps. Know them when you debug a lane:

- **Never build on the host.** Admin/storefront builds run in the `web` container.
- **Check the Mutagen mode when container-created files vanish.** Lanes use
  `two-way-resolved` (container output syncs back to the host). A
  `one-way-replica` session mirrors host to container and deletes anything created
  only in the container within seconds (webpack `dist/`, `.env.local`,
  `install.lock`), which leads to `/installer` loops and a storefront without JS.
  `sw-dev sync` uses the `mode` from `instances.json` (older `lib/mutagen.sh`
  forced `one-way-replica` for non-agentic lanes). Verify with
  `mutagen sync list <session> -l | grep "Synchronization mode"`.
- **Generated output is Mutagen-ignored.** `lib/mutagen.sh` ignores
  `install.lock`, `public/bundles`, `public/theme`, `public/administration`,
  `public/storefront`, `src/{Administration,Storefront}/Resources/public` and the
  storefront `vendor/`. If you add such a path, add it there too.
- **Storefront without CSS on a fresh lane:** `system:install` cannot compile the
  theme before the storefront npm deps exist. After `npm run production` and
  `node copy-to-vendor.js`, run `bin/console theme:change Storefront --all --sync`.
- **`PROJECT_ROOT` is set on `web`** by `overrides/shared.podman-mutagen.yaml`; the
  admin Vite build needs it or dies with `paths[0] must be of type string`.
- After changing `lib/mutagen.sh` ignores or the shared override:
  `sw-dev sync all` (recreates sessions) and
  `podman compose up -d --force-recreate web` (applies env).
- For API/Admin-only work (e.g. MCP), you do **not** need the storefront theme;
  skip `theme:compile`.
- **OpenSearch is off by default** (compose profile `opensearch` in the shared
  override). If the task sets `SHOPWARE_ES_ENABLED` / `SHOPWARE_ADMIN_ES_ENABLED`,
  runs `es:*` commands, or touches `src/Elasticsearch/` or its integration tests,
  enable it for this lane only. Steps: [`podman-hub.md`](podman-hub.md#opensearch-opt-in-per-lane).
  Do not remove the profile from the shared override; the VM cannot run one
  OpenSearch per lane.

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
sw-dev proxy restart         # reload the proxy after the lane list changed
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
| `php bin/console …` on host (linked) | `podman compose exec web bin/console …` |
| `composer install` on host (linked) | `podman compose exec web composer install` |
| `./vendor/bin/phpunit` on host (linked) | MCP `phpunit_run` if callable, else exec in `web` |
| Reconstruct validate with phpstan/eslint by hand (CLI project) | `shopware-cli project validate` / `extension validate` |
| `shopware-cli` against a linked shopware-dev trunk | `podman compose exec web …` |
| Read host `vendor/` for symbols | Search source or use LSP/MCP in container |
| Edit `compose.override.yaml` in project | Edit `~/shopware-dev/instances/*.yaml` |
| `composer require` a private extension in a lane | `sw-dev ext sync <lane>` |
| Commit a `composer.json` with extension wiring | `sw-dev ext adopt <lane>`, then commit |
| Hand-edit `instances.json` for a new version | `sw-dev lane create <id> --ref <tag>` |
| `podman volume prune` when the VM disk is full | `sw-dev space`, then `sw-dev prune` |
| `es:index` fails with no OpenSearch host, so remove the profile from the shared override | Enable OpenSearch for this lane only (`COMPOSE_PROFILES=opensearch` in `.env`), see the hub reference |

## Hub layout (edit once)

```text
~/shopware-dev/
  instances.json
  overrides/shared.podman-mutagen.yaml
  instances/trunk.yaml, sw66.yaml, …
  tooling/mcp-*.base.json
  proxy/dev_host_proxy.py
  lib/startup.sh, lib/mutagen.sh, lib/agentic.sh, lib/lanes.sh, …
  bin/sw-dev
```
