#!/usr/bin/env bash
# The Vagrantfile syncs the project to /var/www/shopware in the VM.
set -euo pipefail

vagrant ssh -c "cd /var/www/shopware && vendor/bin/phpunit --filter CartProcessorTest"
vagrant ssh -c "cd /var/www/shopware && composer phpstan"
