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
has_host=0
has_window_listen=0
has_window_unlisten=0
has_raw_listener=0
has_plugin_class=0

grep -rqE --include='*.js' 'window\.PluginManager\.register\s*\(' "$WORKDIR" && has_window_register=1
if grep -rqE --include='*.js' "PluginManager\.register\s*\([^)]*['\"]\\[data-scroll-hint\\]['\"]" "$WORKDIR"; then
  has_data_selector=1
fi
if grep -rqE --include='*.twig' --include='*.html' 'data-scroll-hint' "$WORKDIR"; then
  has_host=1
fi
if grep -rqE --include='*.js' 'window\.addEventListener\s*\(\s*['\''"]scroll['\''"]' "$WORKDIR"; then
  has_window_listen=1
fi
if grep -rqE --include='*.js' 'window\.removeEventListener\s*\(\s*['\''"]scroll['\''"]' "$WORKDIR"; then
  has_window_unlisten=1
fi
if grep -rqE --include='*.js' 'document\.addEventListener\s*\(' "$WORKDIR"; then
  has_raw_listener=1
fi
if grep -rqE --include='*.js' 'extends Plugin' "$WORKDIR"; then
  has_plugin_class=1
fi

score=0
if [ "$has_window_register" -eq 1 ] && [ "$has_data_selector" -eq 1 ] && [ "$has_host" -eq 1 ] && [ "$has_window_listen" -eq 1 ] && [ "$has_window_unlisten" -eq 1 ] && [ "$has_plugin_class" -eq 1 ] && [ "$has_raw_listener" -eq 0 ]; then
  score=1
fi

echo "score=$score (window_register=$has_window_register data_selector=$has_data_selector host=$has_host listen=$has_window_listen unlisten=$has_window_unlisten plugin_class=$has_plugin_class raw_listener=$has_raw_listener)"
[ "$score" -eq 1 ]
