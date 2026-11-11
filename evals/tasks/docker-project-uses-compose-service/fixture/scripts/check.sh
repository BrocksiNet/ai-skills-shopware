#!/usr/bin/env bash
set -euo pipefail

docker exec -it shopware_app vendor/bin/phpunit --filter CartProcessorTest
docker exec -it shopware_app composer phpstan
