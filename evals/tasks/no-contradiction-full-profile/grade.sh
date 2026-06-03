#!/usr/bin/env bash
# Grader: no-contradiction-full-profile
# Detects contradictory guidance in the transcript when a full skill set is loaded.
# Deterministic contradiction checks first; LLM-judge is the documented fallback
# for fuzzier coherence (set SKILLS_JUDGE_CMD to enable it).
set -euo pipefail

WORKDIR="${WORKDIR:?WORKDIR not set}"
TRANSCRIPT="${TRANSCRIPT:-/dev/null}"

contradiction=0
notes=""

# Cache: must not recommend BOTH the deprecated event and the collector.
if grep -qiE 'CacheTagsEvent' "$TRANSCRIPT" && grep -qiE 'CacheTagCollector' "$TRANSCRIPT"; then
  # collector-only is fine; both being *recommended* is the contradiction.
  if grep -qiE '(use|add|subscribe).*CacheTagsEvent' "$TRANSCRIPT"; then
    contradiction=1; notes="$notes [recommends both CacheTagsEvent and CacheTagCollector]"
  fi
fi

# Testing: must not call the same unit test both "no kernel" and integration.
if grep -qiE 'unit test' "$TRANSCRIPT" && grep -qiE 'IntegrationTestBehaviour' "$TRANSCRIPT"; then
  contradiction=1; notes="$notes [mixes unit test with IntegrationTestBehaviour]"
fi

# Final code sanity: the produced code should use the collector, not the event.
if grep -rqiE 'CacheTagsEvent' "$WORKDIR" 2>/dev/null; then
  contradiction=1; notes="$notes [final code still references deprecated event]"
fi

judge="n/a"
if [ "$contradiction" -eq 0 ] && [ -n "${SKILLS_JUDGE_CMD:-}" ]; then
  # Optional fuzzy coherence check. Judge prints PASS/FAIL.
  judge="$(printf 'Does this transcript contain contradictory instructions? Answer PASS if coherent, FAIL if not.\n\n%s' "$(cat "$TRANSCRIPT")" | eval "$SKILLS_JUDGE_CMD" || echo PASS)"
  echo "$judge" | grep -qi FAIL && contradiction=1
fi

score=0
[ "$contradiction" -eq 0 ] && score=1
echo "score=$score judge=$judge notes=${notes:-none}"
[ "$score" -eq 1 ]
