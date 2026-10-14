#!/usr/bin/env bash
# Linked shopware-dev checkout: code and vendor/ live in the Podman volume,
# so every PHP tool runs in the web container from the project root.
set -euo pipefail

cd "$(dirname "$0")/.."

podman compose exec web vendor/bin/phpunit --filter CartProcessorTest
podman compose exec web composer phpstan
