# Task: move safeguard test out of unit suite

The file `tests/unit/Core/Framework/Mcp/McpDiscoveryScanDirsConfigTest.php` is a
**safeguard** test marked `#[CoversNothing]`. On shopware/shopware core, such tests
belong in **`tests/devops/`**, not `tests/unit/`.

Move it to the matching path under `tests/devops/` (keep the class and test logic;
update the namespace if required). Keep `#[CoversNothing]`.
