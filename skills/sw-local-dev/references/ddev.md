# DDEV

A DDEV project has `.ddev/config.yaml`. PHP, Composer, Node and the
database run in DDEV's containers; the host only runs `ddev`.

- **DEV-002** In a DDEV project, run PHP, Composer, console and npm
  commands through `ddev` (`ddev exec`, `ddev composer`, `ddev npm`), never
  on the host.

## Commands

| Task | Command |
| ---- | ------- |
| Composer | `ddev composer install`, `ddev composer phpstan` |
| Console | `ddev exec bin/console cache:clear` |
| A binary | `ddev exec vendor/bin/phpunit --filter CartProcessorTest` |
| npm in the project root | `ddev npm ci` |
| npm in a subfolder | `ddev exec --dir /var/www/html/src/Administration/Resources/app/administration npm run lint` |
| Database shell | `ddev mysql` |
| URLs, ports, credentials | `ddev describe` |

`ddev exec` runs in the `web` service; `--service db` (`-s db`) picks
another one. The project is mounted at `/var/www/html`, so absolute paths
in a script start there, not at the host path. `ddev composer` honours
`composer_root` from `.ddev/config.yaml` when `composer.json` is not in
the project root.

## Database

Inside the containers the host is `db`, port 3306; user, password and
database are each `db`. From the host, `ddev describe` shows the published
port. A `DATABASE_URL` pointing at `127.0.0.1` works on the host only, not
in `ddev exec`.

## Mistakes

| Wrong | Right |
| ----- | ----- |
| `vendor/bin/phpunit` or `php bin/console` on the host | `ddev exec vendor/bin/phpunit`, `ddev exec bin/console` |
| `docker exec` into DDEV's container by name | `ddev exec` (DDEV names containers per project) |
| `cd src/Administration/... && ddev npm run lint` and expecting that folder | `ddev exec --dir /var/www/html/<folder> npm run lint` |
