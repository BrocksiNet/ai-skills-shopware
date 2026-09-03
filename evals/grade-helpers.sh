#!/usr/bin/env bash
# Shared scoped extractors for eval grade.sh scripts.
# Source this file. Do not execute it.

# Flatten a file to one line (preserves comments). Use only when the
# comment itself is the subject (for example @codeCoverageIgnore).
grade_flat() {
  tr '\n' ' ' < "$1"
}

# Drop block comments, Twig/HTML comments, and // line comments (not URLs).
# Keeps PHP #[...] attributes. Reads stdin.
grade_strip_comments() {
  perl -0777 -pe '
    s{/\*.*?\*/}{}sg;
    s{\{#.*?#\}}{}sg;
    s{<!--.*?-->}{}sg;
    s{(?<!:)//[^\n]*}{}g;
  '
}

grade_without_comments() {
  grade_strip_comments < "$1"
}

# Print one PHP method after comments are stripped.
grade_php_method() {
  local file="$1"
  local name="$2"
  grade_without_comments "$file" | awk -v m="$name" '
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
  '
}

grade_php_method_flat() {
  grade_php_method "$1" "$2" | tr '\n' ' '
}

# Print the argument list of the first name(...) call (comments stripped).
grade_js_call_args() {
  local file="$1"
  local name="$2"
  grade_without_comments "$file" | perl -0777 -e '
    my $name = $ARGV[0];
    my $t = do { local $/; <STDIN> };
    if ($t =~ /\Q$name\E\s*\(/) {
      my $start = $-[0] + length($&);
      my $depth = 1;
      for my $i ($start .. length($t) - 1) {
        my $c = substr($t, $i, 1);
        $depth++ if $c eq "(";
        $depth-- if $c eq ")";
        if ($depth == 0) {
          print substr($t, $start, $i - $start);
          last;
        }
      }
    }
  ' "$name"
}
