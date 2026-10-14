#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

composer install
podman compose -f compose.override.yaml exec web vendor/bin/phpunit --filter CartProcessorTest
docker compose exec web composer phpstan
