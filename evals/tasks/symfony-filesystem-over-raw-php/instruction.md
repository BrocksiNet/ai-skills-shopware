# Task: fix the file write in SnippetDumper (core)

You are working on **Shopware core** (`shopware/shopware` trunk).
Core review flagged how `SnippetDumper::dump()` writes the file, and the class
is hard to unit test as it is.

Rework `SnippetDumper.php` so it follows core's service conventions for this.
Keep the public `dump()` signature.
