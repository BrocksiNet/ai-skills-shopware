#!/usr/bin/env bash
# Shared scoped extractors for eval grade.sh scripts.
# Source this file. Do not execute it.

# Flatten a file to one line (preserves comments).
grade_flat() {
  tr '\n' ' ' < "$1"
}

# Drop block comments, Twig/HTML comments, and // line comments (not URLs).
grade_without_comments() {
  perl -0777 -pe '
    s{/\*.*?\*/}{}sg;
    s{\{#.*?#\}}{}sg;
    s{<!--.*?-->}{}sg;
    s{(?<!:)//[^\n]*}{}g;
  ' "$1"
}

# Print one PHP method including its signature and body.
grade_php_method() {
  local file="$1"
  local name="$2"
  awk -v m="$name" '
    BEGIN { grab = 0; d = 0; seen = 0 }
    $0 ~ "function[[:space:]]+" m "[[:space:]]*\\(" { grab = 1 }
    grab {
      print
      for (i = 1; i <= length($0); i++) {
        c = substr($0, i, 1)
        if (c == "{") { d++; seen = 1 }
        if (c == "}") {
          d--
          if (seen && d <= 0) exit
        }
      }
    }
  ' "$file"
}

grade_php_method_flat() {
  grade_php_method "$1" "$2" | tr '\n' ' '
}
