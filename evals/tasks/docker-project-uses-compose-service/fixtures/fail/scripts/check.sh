#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

docker compose exec web vendor/bin/phpunit --filter CartProcessorTest
docker compose exec web composer phpstan
