#!/usr/bin/env bash
# DDEV project: the database host `db` resolves only inside the DDEV web
# container, so PHP tools run through ddev.
set -euo pipefail

ddev exec vendor/bin/phpunit --filter CartProcessorTest
ddev composer phpstan
