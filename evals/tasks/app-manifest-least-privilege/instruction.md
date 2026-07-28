# Task: least-privilege manifest

Tighten `fixture/manifest.xml` permissions — remove wildcard `create:all` / broad
`read:all` entries. Keep only the specific entity permissions the example app
needs (product read + order read).
