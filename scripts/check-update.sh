#!/usr/bin/env bash
#
# Report whether a newer release of this skills repo is available, and print
# the exact command to update. Wrapper for tools/bin/check-update.ts (Node 24+).
#
# Resolves the locally pinned version from (in order):
#   1. $SKILLS_PINNED_VERSION env var
#   2. a `.skills-version` file in the current dir or repo root
#   3. otherwise treats the local copy as "unpinned"
#
# Resolves the latest release tag from the GitHub API (GH_TOKEN or
# GITHUB_TOKEN is used when set).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
exec node "$ROOT/tools/bin/check-update.ts" "$@"
