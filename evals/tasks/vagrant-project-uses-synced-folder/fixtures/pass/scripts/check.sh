#!/usr/bin/env bash
# Two machines; `app` gets the code by rsync, one way, so sync edits first.
set -euo pipefail

vagrant rsync app
vagrant ssh app -c "cd /var/www/shopware && vendor/bin/phpunit --filter CartProcessorTest"
vagrant ssh app -c "cd /var/www/shopware && composer phpstan"
