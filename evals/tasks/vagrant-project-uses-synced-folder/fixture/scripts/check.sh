#!/usr/bin/env bash
set -euo pipefail

vagrant ssh -c "vendor/bin/phpunit --filter CartProcessorTest"
vagrant ssh -c "composer phpstan"
