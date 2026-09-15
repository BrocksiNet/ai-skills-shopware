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

main_js="$(find "$WORKDIR" -path '*/storefront/src/main.js' | head -n1 || true)"
plugin_file=""
if [[ -n "$main_js" ]]; then
  plugin_spec="$(perl -0777 -ne '
    if (m/PluginManager\.register\s*\(\s*['\''"]ScrollHint['\''"][\s\S]*?import\s*\(\s*['\''"]([^'\''"]+)['\''"]/) {
      print $1;
    }
  ' "$main_js")"
  if [[ -n "$plugin_spec" ]]; then
    plugin_spec="${plugin_spec#./}"
    case "$plugin_spec" in
      *.js|*.ts) plugin_rel="$plugin_spec" ;;
      *) plugin_rel="${plugin_spec}.js" ;;
    esac
    candidate="$(cd "$(dirname "$main_js")" && pwd)/${plugin_rel}"
    if [[ -f "$candidate" ]]; then
      plugin_file="$candidate"
    fi
  fi
fi

js_flat="$(find "$WORKDIR" -name '*.js' -print0 | xargs -0 cat | tr '\n' ' ')"

printf '%s' "$js_flat" | grep -qE 'window\.PluginManager\.register\s*\(' && has_window_register=1
if printf '%s' "$js_flat" | grep -qE "PluginManager\.register\s*\(.*['\"]\\[data-scroll-hint\\]['\"]"; then
  has_data_selector=1
fi
if grep -rqE --include='*.twig' --include='*.html' 'data-scroll-hint' "$WORKDIR"; then
  has_host=1
fi
# Listeners must live on the registered ScrollHint plugin module.
if [[ -n "$plugin_file" ]]; then
  has_plugin_class=1
  if grep -qE -- 'window\.addEventListener\s*\(\s*['\''"]scroll['\''"]' "$plugin_file"; then
    has_window_listen=1
  fi
  if grep -qE -- 'window\.removeEventListener\s*\(\s*['\''"]scroll['\''"]' "$plugin_file"; then
    has_window_unlisten=1
  fi
fi
if printf '%s' "$js_flat" | grep -qE 'document\.addEventListener\s*\('; then
  has_raw_listener=1
fi

score=0
if [ "$has_window_register" -eq 1 ] && [ "$has_data_selector" -eq 1 ] && [ "$has_host" -eq 1 ] && [ "$has_window_listen" -eq 1 ] && [ "$has_window_unlisten" -eq 1 ] && [ "$has_plugin_class" -eq 1 ] && [ "$has_raw_listener" -eq 0 ]; then
  score=1
fi

echo "score=$score (window_register=$has_window_register data_selector=$has_data_selector host=$has_host listen=$has_window_listen unlisten=$has_window_unlisten plugin_class=$has_plugin_class raw_listener=$has_raw_listener)"
[ "$score" -eq 1 ]
