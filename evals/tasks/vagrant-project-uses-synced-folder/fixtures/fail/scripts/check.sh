#!/usr/bin/env bash
set -euo pipefail

vagrant ssh -c "cd /vagrant && vendor/bin/phpunit --filter CartProcessorTest"
vagrant ssh -c "cd /vagrant && composer phpstan"
