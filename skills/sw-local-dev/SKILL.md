---
name: sw-local-dev
description: >-
  Run Shopware dev commands in the project's environment: DDEV, Docker
  Compose, Vagrant, native host PHP, or linked shopware-dev checkouts with
  Podman and Mutagen. Use when running or scripting php, composer,
  phpunit, bin/console, phpstan, ecs, npm or database commands, when a
  check script or hook fails with a missing vendor/autoload.php or a
  container that does not exist, when choosing between ddev exec, docker
  compose exec, vagrant ssh and podman compose exec, for shopware-dev lanes
  (trunk.localhost, Mutagen sync, lane create/update/remove, Podman disk
  cleanup, OpenSearch on a lane), and for Shopware CLI projects with
  .shopware-project.yml (project console, project validate, extension
  validate). Do NOT use for CI log interpretation, PR descriptions, PHPUnit
  test structure rules (sw-testing), or unrelated PHP, Node, Nuxt or Astro
  projects.
license: MIT
metadata:
  contexts: core plugin app project
  tasks: run
  load_for: run
---

# Shopware local execution

Run every Shopware command where the project runs: in its containers, its
VM or on the host. A command in the wrong place fails with a missing
`vendor/autoload.php`, a database it cannot reach or a container that does
not exist, or it quietly uses the host's PHP and `vendor/`. MCP tooling is
optional and must never block a fallback.

## Applicability

Apply this skill only to Shopware work: a Shopware core checkout, a
plugin or app, a project requiring Shopware packages, or
`.shopware-project.yml`. A generic `composer.json`, `package.json` or
`compose.yaml` alone does not make a project Shopware; keep an unrelated
project's own tooling.

## Find the environment

Check in this order and read the matching reference before writing a
command:

| Marker in the project root | Environment | Read |
| -------------------------- | ----------- | ---- |
| `AGENTS.local.md` | what it says; core copies it from `.agents-templates/` | the reference it names |
| `.env` contains `shopware-dev (managed by sw-dev)` | Podman lane | [`podman.md`](references/podman.md) |
| `.ddev/config.yaml` | DDEV | [`ddev.md`](references/ddev.md) |
| `Vagrantfile` | Vagrant | [`vagrant.md`](references/vagrant.md) |
| `compose.yaml` or `docker-compose.yml` with a PHP service | Docker Compose | [`docker.md`](references/docker.md) |
| `.shopware-project.yml` | Shopware CLI project | [`shopware-cli-routing.md`](references/shopware-cli-routing.md) |
| none of these, or the user says native | host PHP and Node | [`native.md`](references/native.md) |

A core template is a starting point, not the truth: check its container
names and paths against `compose.yaml` or the `Vagrantfile`.

## Rules

1. Never run `php`, `composer`, `phpunit`, `bin/console`, `phpstan`, `ecs`,
   `rector` or Shopware `npm` scripts on the host of a container or VM
   project unless the user says native.
2. Never trust host `vendor/`, `var/` or `node_modules/` in such a project;
   they may be stale or missing.
3. Always run from the project root (where `compose.yaml`, `.ddev/`, the
   `Vagrantfile` or `.shopware-project.yml` is), and give paths inside the
   container or VM as that side sees them.
4. Write scripts, hooks and CI steps without an interactive terminal
   (`docker compose exec -T`, no `-it`).
5. Do not block on missing MCP; fall back to the environment's own command.

## The same task everywhere

| Task | DDEV | Docker Compose | Vagrant | Podman lane | Native |
| ---- | ---- | -------------- | ------- | ----------- | ------ |
| One test | `ddev exec vendor/bin/phpunit --filter X` | `docker compose exec web vendor/bin/phpunit --filter X` | `vagrant ssh -c "cd /vagrant && vendor/bin/phpunit --filter X"` | `podman compose exec web vendor/bin/phpunit --filter X` | `vendor/bin/phpunit --filter X` |
| Console | `ddev exec bin/console …` | `docker compose exec web bin/console …` | `vagrant ssh -c "cd /vagrant && bin/console …"` | `podman compose exec web bin/console …` | `bin/console …` |
| Composer | `ddev composer …` | `docker compose exec web composer …` | `vagrant ssh -c "cd /vagrant && composer …"` | `podman compose exec web composer …` | `composer …` |
| Database host | `db` | the compose service | from `.env` in the VM | the compose service | `127.0.0.1` |

The service `web` and the folder `/vagrant` are the usual names; the
references say where to check the real ones.

## Shopware CLI projects and extensions

For `.shopware-project.yml`, standalone extensions or a requested Shopware
setup, read [Shopware CLI routing](references/shopware-cli-routing.md) and
load the installed upstream `shopware-cli` skill. Do not route a linked
shopware-dev lane through `shopware-cli`. Install the CLI skills
separately; do not copy them:

```bash
npx skills add shopware/shopware-cli
```

Read the reference that matches the task or the files it changes:

<!-- routes:start: generated from routes.json by `node tools/bin/render-routes.ts`; do not edit -->
| Read | When | Or the change touches |
| ---- | ---- | --------------------- |
| [`ddev.md`](references/ddev.md) | The project has `.ddev/config.yaml`, or a command goes through `ddev`. | `.ddev/**`, `\bddev (exec\|composer\|npm\|mysql\|describe)\b` |
| [`docker.md`](references/docker.md) | The project runs in Docker Compose, or a command goes through `docker compose exec` or `docker exec`. | `compose*.y*ml`, `docker-compose*.y*ml`, `\bdocker([ -]compose)? (exec\|run)\b`, … |
| [`vagrant.md`](references/vagrant.md) | The project has a `Vagrantfile`, or a command goes through `vagrant ssh`. | `Vagrantfile`, `\bvagrant ssh\b` |
| [`podman.md`](references/podman.md) | The project is a linked shopware-dev lane (Podman and Mutagen), or a command goes through `podman compose` or `sw-dev`. | `Containerfile`, `mutagen*.y*ml`, `COMPOSE_(FILE\|PROFILES)=`, … |
| [`podman-hub.md`](references/podman-hub.md) | You need the shopware-dev hub layout, OpenSearch per lane, or a `sw-dev` command not in `podman.md`. | on demand |
| [`native.md`](references/native.md) | The user says native or WSL, or the project has none of the environment markers. | on demand |
| [`shopware-cli-routing.md`](references/shopware-cli-routing.md) | Choose Shopware CLI project or standalone extension commands, validation scope, or version-specific flags. | on demand |
<!-- routes:end -->
