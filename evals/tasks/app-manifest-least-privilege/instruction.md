# Task: least-privilege manifest

Tighten the permissions in `manifest.xml`: remove the wildcard
`<create>all</create>` / `<read>all</read>` entries. Keep only the specific
entity permissions the example app needs (product read + order read).
