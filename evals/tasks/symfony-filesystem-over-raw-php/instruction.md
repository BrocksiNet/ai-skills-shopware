# Task: inject Symfony Filesystem instead of raw PHP file functions

Update `SnippetDumper.php` so it writes through Symfony `Filesystem`
instead of `file_put_contents`.

- Inject `Symfony\Component\Filesystem\Filesystem` (constructor promotion).
- Replace `file_put_contents($path, $contents)` with `$this->filesystem->dumpFile($path, $contents)`.
- Keep the public `dump()` signature.
