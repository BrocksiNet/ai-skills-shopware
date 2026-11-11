#!/usr/bin/env bash
set -euo pipefail

docker compose exec web vendor/bin/phpunit --filter CartProcessorTest
docker compose exec web composer phpstan
