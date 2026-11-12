#!/usr/bin/env bash
set -euo pipefail

vendor/bin/phpunit --filter CartProcessorTest
docker compose exec web composer phpstan
