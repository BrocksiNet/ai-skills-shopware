#!/usr/bin/env bash
set -euo pipefail

docker compose exec -T web vendor/bin/phpunit --filter CartProcessorTest
docker exec -it shopware_app composer phpstan
