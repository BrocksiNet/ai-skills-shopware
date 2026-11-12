#!/usr/bin/env bash
set -euo pipefail

ddev start
vendor/bin/phpunit --filter CartProcessorTest
ddev composer phpstan
