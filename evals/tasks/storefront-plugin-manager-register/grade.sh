#!/usr/bin/env bash
# Grader: storefront-plugin-manager-register
set -euo pipefail

WORKDIR="${WORKDIR:?WORKDIR not set}"

if ! find "$WORKDIR" -name '*.js' | grep -q .; then
  echo "score=0 (no JS files)"
  exit 1
fi

has_window_register=0
has_data_selector=0
has_raw_listener=0
has_plugin_class=0
has_destroy=0

grep -rqE --include='*.js' 'window\.PluginManager\.register\s*\(' "$WORKDIR" && has_window_register=1
if grep -rqE --include='*.js' "PluginManager\.register\s*\([^)]*['\"]\\[data-[^'\"]+['\"]" "$WORKDIR"; then
  has_data_selector=1
fi
if grep -rqE --include='*.js' 'document\.addEventListener\s*\(' "$WORKDIR"; then
  has_raw_listener=1
fi
if grep -rqE --include='*.js' 'extends Plugin' "$WORKDIR"; then
  has_plugin_class=1
fi
if grep -rqE --include='*.js' 'destroy\s*\(' "$WORKDIR"; then
  has_destroy=1
fi

score=0
if [ "$has_window_register" -eq 1 ] && [ "$has_data_selector" -eq 1 ] && [ "$has_plugin_class" -eq 1 ] && [ "$has_destroy" -eq 1 ] && [ "$has_raw_listener" -eq 0 ]; then
  score=1
fi

echo "score=$score (window_register=$has_window_register data_selector=$has_data_selector plugin_class=$has_plugin_class destroy=$has_destroy raw_listener=$has_raw_listener)"
[ "$score" -eq 1 ]
