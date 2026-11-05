---
name: sw-podman-dev
description: >-
  Run Shopware dev commands in the right environment. Use for linked
  shopware-dev checkouts (Podman and Mutagen: php, composer install, phpunit,
  bin/console, phpstan, ecs, npm, podman compose, mutagen sync,
  trunk.localhost lanes, creating, updating or removing a lane, Podman disk
  cleanup, extension wiring that dirties composer.json, enabling OpenSearch on
  a lane) and for Shopware CLI
  projects with .shopware-project.yml (shopware-cli project console, project validate,
  extension validate). Do NOT use for CI log interpretation, PR descriptions,
  or PHPUnit test structure rules (sw-testing), or unrelated PHP, Node, Nuxt or Astro projects.
license: MIT
metadata:
  contexts: core plugin app project
  tasks: run
  load_for: run
---

# Shopware local execution (Podman and CLI)

Use the **project's** runner. Linked `shopware-dev` trees run inside **Podman**
with **Mutagen** sync — host PHP/Composer/PHPUnit/Node are wrong because code
and `vendor/` live in the container volume. Shopware CLI projects
(`.shopware-project.yml`) should go through **shopware-cli**, not reconstructed
composer/`bin/console`/npm. MCP is optional and must never block a fallback.

## Applicability and CLI handoff

Apply this skill only to Shopware work: a verified Shopware core checkout,
plugin/app, a project requiring Shopware packages, or `.shopware-project.yml`.
A generic `composer.json`, `package.json`, `compose.yaml` or installed CLI does
not establish applicability. For unrelated projects, retain their own tooling.

For CLI-managed projects, standalone extensions, or a requested Shopware setup,
read [Shopware CLI routing](references/shopware-cli-routing.md) and load the
installed upstream `shopware-cli` skill. Use its Docker or Store skill only when
that operation needs it. Keep those skills upstream-owned; do not copy them into
this library or SoftwareFactory. If missing, use the installed binary's help for
the bounded task and report the missing skill; do not silently install it.

## Hard rules

1. **Never** run `php`, `composer`, `phpunit`, `bin/console`, `phpstan`,
   `ecs`, `rector`, or Shopware `npm`/`node` scripts on the **host** for a
   linked shopware-dev project unless the user explicitly says native/no-container.
2. **Never** assume `vendor/`, `var/`, or `node_modules/` on the host are
   current on a linked project — Mutagen syncs into the container named volume.
3. **Always** `cd` to the **project root** (where `compose.yaml` or
   `.shopware-project.yml` lives) before compose, CLI, or MCP commands.
4. **Do not block** on missing MCP. If php-tooling MCP is down, use Podman or
   `shopware-cli` instead of stalling.
5. **Never** `composer require` private extensions (agentic commerce, UCP SDK,
   MCP extensions) into a lane's tracked `composer.json`. Use `sw-dev ext sync
   <lane>`, which wires them through the git-excluded `composer.sw-dev.json`.
6. **Never** remove a lane, a lane volume or a checkout without the user's
   go-ahead. `trunk` is permanent. Run `sw-dev lane remove` and `sw-dev prune`
   as a dry run first and show the user what they would delete.

## Command priority

Match the project, then use the first option that works:

| Detect | Prefer | Fallback |
| ------ | ------ | -------- |
| `.env` contains `shopware-dev (managed by sw-dev)` | `podman compose exec web …` (MCP php-tooling if it is actually callable) | Host CLI only if the user confirms native |
| `.shopware-project.yml` and **not** a linked shopware-dev tree | `shopware-cli` after checking the installed version and command help | CLI Docker skill if the project is Docker-backed |
| Standalone Shopware plugin/app | `shopware-cli extension validate <path>` after checking help | Keep project toolset checks separate |
| Unrelated project | Its own runner; no Shopware CLI handoff | — |
| User said native (Shopware) | Host CLI | — |

Do **not** route a linked `shopware-dev` trunk through `shopware-cli` by default
(Docker vs Podman mismatch). Install the CLI skills separately; do not copy them:

```bash
npx skills add shopware/shopware-cli
```

MCP configs for linked projects are symlinked from `~/shopware-dev`
(`.mcp-php-tooling.json`, etc.). They target compose service `web`, workdir
`/var/www/html`. Set `enforce_mcp_tools: false` if that plugin is installed so
hooks cannot veto Podman or `shopware-cli`.

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
  enable it for this lane only. Steps: [`references/shopware-dev-hub.md`](references/shopware-dev-hub.md#opensearch-opt-in-per-lane).
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

Read the reference that matches the task or the files it changes:

<!-- routes:start: generated from routes.json by `node tools/bin/render-routes.ts`; do not edit -->
| Read | When | Or the change touches |
| ---- | ---- | --------------------- |
| [`shopware-dev-hub.md`](references/shopware-dev-hub.md) | You need the hub layout or a command not listed above. | `compose*.y*ml`, `docker-compose*.y*ml`, `COMPOSE_(FILE\|PROFILES)=`, … |
| [`shopware-cli-routing.md`](references/shopware-cli-routing.md) | Choose Shopware CLI project or standalone extension commands, validation scope, or version-specific flags. | on demand |
<!-- routes:end -->
