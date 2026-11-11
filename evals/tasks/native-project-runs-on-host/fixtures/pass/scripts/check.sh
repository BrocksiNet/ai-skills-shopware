#!/usr/bin/env bash
# No container or VM here: PHP and MariaDB run on this machine.
set -euo pipefail

cd "$(dirname "$0")/.."

vendor/bin/phpunit --filter CartProcessorTest
composer phpstan
