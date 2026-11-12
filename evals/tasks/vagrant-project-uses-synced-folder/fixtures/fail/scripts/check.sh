#!/usr/bin/env bash
set -euo pipefail

vagrant ssh app -c "cd /var/www/shopware && vendor/bin/phpunit --filter CartProcessorTest"
vagrant ssh app -c "cd /var/www/shopware && composer phpstan"
