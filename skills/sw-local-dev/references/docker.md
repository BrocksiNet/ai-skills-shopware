# Docker Compose

A project with `compose.yaml` (or `docker-compose.yml`) and no DDEV,
Vagrant or shopware-dev marker. Shopware's own `compose.yaml` uses the
`ghcr.io/shopware/docker-dev` image with the code in service `web` at
`/var/www/html`.

- **DEV-003** In a Docker Compose project, run PHP and Node commands in the
  service `compose.yaml` defines (`docker compose exec <service>`), not in a
  container name copied from a template that the project does not define.

## Find the service

Read `compose.yaml` before writing a command. Use the **service** name
with `docker compose exec`; a `container_name:` is only needed for plain
`docker exec`. Core's `.agents-templates/AGENTS.local.template.docker.md`
names containers `shopware_app` and `shopware_node`; core's own
`compose.yaml` defines neither, so check `docker compose ps` instead of
copying them.

## Commands

| Task | Command |
| ---- | ------- |
| Composer | `docker compose exec web composer phpstan` |
| Console | `docker compose exec web bin/console cache:clear` |
| A binary | `docker compose exec web vendor/bin/phpunit --filter CartProcessorTest` |
| npm in a subfolder | `docker compose exec -w /var/www/html/src/Administration/Resources/app/administration web npm run lint` |
| Is it up? | `docker compose ps`, start with `docker compose up -d` |

In a script, hook or CI step there is no terminal. `docker compose exec`
allocates one by default, so add `-T` (`docker compose exec -T web …`);
`docker exec -it` fails there with "the input device is not a TTY".

## Database

Containers reach the database by its service name (`database` in core's
`compose.yaml`), not `127.0.0.1`. The host reaches it through the port
the service publishes.

## Mistakes

| Wrong | Right |
| ----- | ----- |
| PHP tools on the host | `docker compose exec web …` |
| `docker exec -it shopware_app …` copied from the template | the service from `compose.yaml`, e.g. `docker compose exec web …` |
| `-it` in a script | `docker compose exec -T` |
