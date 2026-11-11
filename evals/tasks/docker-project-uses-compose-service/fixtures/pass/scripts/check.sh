#!/usr/bin/env bash
# compose.yaml names the PHP service `web`; there is no shopware_app container.
set -euo pipefail

cd "$(dirname "$0")/.."

docker compose exec -T web vendor/bin/phpunit --filter CartProcessorTest
docker compose exec -T web composer phpstan
