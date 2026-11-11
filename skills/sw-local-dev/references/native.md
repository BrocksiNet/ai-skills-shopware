# Native (host PHP and Node)

Native means PHP, Composer, Node and the database run on the host, or in
WSL. Nothing wraps the commands. Take it as native only when the user says
so, or `AGENTS.local.md` says so, or the project has none of the markers
of the other environments (`.ddev/`, `Vagrantfile`, `compose.yaml` with a
PHP service, the shopware-dev line in `.env`).

- **DEV-005** In a native project, run commands directly on the host; do
  not wrap them in `docker`, `ddev`, `vagrant` or `podman` when the project
  has no such environment.

## Commands

```bash
vendor/bin/phpunit --filter CartProcessorTest
composer phpstan
bin/console cache:clear
(cd src/Administration/Resources/app/administration && npm run lint)
```

Core needs PHP 8.2 or newer, Composer and Node on the host. Check
`php -v` and `node -v` against `composer.json` and `.nvmrc` when a command
fails on syntax or engine errors.

## Database

`DATABASE_URL` in `.env` or `.env.local` points at the host database,
usually `127.0.0.1`. A host named like a compose service (`database`,
`db`) means the file was written for containers.

## Mistakes

| Wrong | Right |
| ----- | ----- |
| `docker compose exec web …` with no compose file or running stack | run the command directly |
| `php vendor/bin/phpunit` with a different PHP than the project needs | the PHP that `composer.json` requires |
