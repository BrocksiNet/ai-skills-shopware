# Asset lifetime behind the HTTP cache (core)

Load when code deletes, moves or overwrites theme files, media or thumbnails,
or schedules their cleanup.

Cached pages keep the URLs they were rendered with. The files behind those
URLs must outlive the cache entries.

## Rules

- **CORE-075** **Do not delete, move or overwrite a file a cached response can
  reference** (theme CSS and JS under `theme/<hash>/`, media, thumbnails).
  Write new files under a new path and retire the old ones later; pages cached
  before the change keep requesting the old URL.
- **CORE-076** **A grace period starts when the reference changes**, not at the
  file's modification time (see the `.retired` marker in
  `UnusedThemeDirectoryDeleter`). Measured from the mtime, a file written last
  week and replaced a minute ago is deleted at once.
- **CORE-077** **Clean up referenced assets asynchronously**, in a scheduled task
  or message handler, never in a command, request, compile step or deploy
  path. Those run right after the switch, when cached pages still use the old
  files.
