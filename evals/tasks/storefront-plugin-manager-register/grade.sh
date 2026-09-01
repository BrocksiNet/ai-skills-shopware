#!/usr/bin/env bash
# Grader: storefront-plugin-manager-register
set -euo pipefail

WORKDIR="${WORKDIR:?WORKDIR not set}"

if ! find "$WORKDIR" -name '*.js' | grep -q .; then
  echo "score=0 (no JS files)"
  exit 1
fi

has_register=0
has_raw_listener=0
has_plugin_class=0

grep -rqE --include='*.js' 'PluginManager\.register\s*\(' "$WORKDIR" && has_register=1
if grep -rqE --include='*.js' 'document\.addEventListener\s*\(' "$WORKDIR"; then
  has_raw_listener=1
fi
if grep -rqE --include='*.js' 'extends Plugin' "$WORKDIR"; then
  has_plugin_class=1
fi

score=0
if [ "$has_register" -eq 1 ] && [ "$has_plugin_class" -eq 1 ] && [ "$has_raw_listener" -eq 0 ]; then
  score=1
fi

echo "score=$score (register=$has_register plugin_class=$has_plugin_class raw_listener=$has_raw_listener)"
[ "$score" -eq 1 ]
