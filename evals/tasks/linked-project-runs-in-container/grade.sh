#!/usr/bin/env bash
# Grader: linked-project-runs-in-container (shopware-podman-dev)
# In a linked shopware-dev project, PHPUnit and PHPStan must run through
# `podman compose exec web`, never on the host, never via docker, and without
# a hand-picked -f compose file (COMPOSE_FILE in .env wins).
set -euo pipefail

WORKDIR="${WORKDIR:?WORKDIR not set}"
file="$WORKDIR/scripts/check.sh"

if [ ! -s "$file" ]; then
  echo "score=0 (scripts/check.sh missing)"
  exit 1
fi

# Strip shell comments, keep commands.
code="$(sed -E 's/(^|[[:space:]])#.*$//' "$file" | grep -vE '^[[:space:]]*$' || true)"

phpunit_in_web=0
printf '%s\n' "$code" | grep -qE 'podman[ -]compose[[:space:]]+(exec|run)([[:space:]]+-[^[:space:]]+)*[[:space:]]+web[[:space:]].*phpunit' && phpunit_in_web=1
phpstan_in_web=0
printf '%s\n' "$code" | grep -qE 'podman[ -]compose[[:space:]]+(exec|run)([[:space:]]+-[^[:space:]]+)*[[:space:]]+web[[:space:]].*phpstan' && phpstan_in_web=1

# A PHP tool on a line that does not go through podman compose = host run.
host_run=0
printf '%s\n' "$code" | grep -vE 'podman[ -]compose' | grep -qE '(^|[[:space:];&|(])(php|composer|phpunit|vendor/bin/[a-z]+|bin/console)([[:space:]]|$)' && host_run=1

docker=0
printf '%s\n' "$code" | grep -qE '(^|[[:space:];&|(])docker([[:space:]]|-compose)' && docker=1

override_file=0
printf '%s\n' "$code" | grep -qE 'compose[[:space:]].*-f[[:space:]]' && override_file=1

score=0
if [ "$phpunit_in_web" -eq 1 ] && [ "$phpstan_in_web" -eq 1 ] && [ "$host_run" -eq 0 ] && [ "$docker" -eq 0 ] && [ "$override_file" -eq 0 ]; then
  score=1
fi

echo "score=$score (phpunit_in_web=$phpunit_in_web phpstan_in_web=$phpstan_in_web host_run=$host_run docker=$docker f_flag=$override_file)"
[ "$score" -eq 1 ]
