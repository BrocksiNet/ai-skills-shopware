#!/usr/bin/env bash
#
# Report whether a newer release of this skills repo is available, and print the
# exact command to update.
#
# Resolves the locally pinned version from (in order):
#   1. $SKILLS_PINNED_VERSION env var
#   2. a `.skills-version` file in the current dir or repo root
#   3. otherwise treats the local copy as "unpinned"
#
# Resolves the latest release tag from GitHub via `gh` (if authed) or `curl`.
set -euo pipefail

REPO="BrocksiNet/ai-skills-shopware"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

pinned=""
if [ -n "${SKILLS_PINNED_VERSION:-}" ]; then
  pinned="$SKILLS_PINNED_VERSION"
elif [ -f ".skills-version" ]; then
  pinned="$(tr -d ' \n' < .skills-version)"
elif [ -f "$ROOT/.skills-version" ]; then
  pinned="$(tr -d ' \n' < "$ROOT/.skills-version")"
fi

latest=""
if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
  latest="$(gh release view --repo "$REPO" --json tagName -q .tagName 2>/dev/null || true)"
fi
if [ -z "$latest" ] && command -v curl >/dev/null 2>&1; then
  latest="$(curl -fsSL "https://api.github.com/repos/$REPO/releases/latest" 2>/dev/null \
    | grep -m1 '"tag_name"' | sed -E 's/.*"tag_name":[[:space:]]*"([^"]+)".*/\1/' || true)"
fi

if [ -z "$latest" ]; then
  echo "Could not determine the latest release tag for $REPO."
  echo "Check your network / 'gh auth login', or browse https://github.com/$REPO/releases"
  exit 1
fi

echo "Repository : $REPO"
echo "Latest tag : $latest"
echo "Pinned     : ${pinned:-<unpinned>}"
echo

if [ -z "$pinned" ]; then
  echo "No local pin found. To update to the latest skills, run:"
  echo "    npx skills update"
  echo "To pin for reproducibility, install with @$latest and record it:"
  echo "    echo '$latest' > .skills-version"
elif [ "$pinned" = "$latest" ]; then
  echo "You are up to date ($pinned)."
else
  echo "An update is available: $pinned -> $latest"
  echo "Run:"
  echo "    npx skills update"
  echo "    echo '$latest' > .skills-version   # update your pin"
fi
