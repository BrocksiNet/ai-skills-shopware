#!/usr/bin/env bash
set -euo pipefail

php vendor/bin/phpunit --filter CartProcessorTest
composer phpstan
