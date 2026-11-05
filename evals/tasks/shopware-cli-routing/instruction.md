# Plan validation for these workspaces

Inspect the four folders under `workspaces/` and the captured CLI help in
`tooling/`. Do not execute checks, install dependencies or change those inputs.
The operator needs both project quality checks and extension metadata checks
where they apply. Retain the existing runner for managed checkouts.

Write `validation-plan.json` as an object keyed by folder name. Each value has
`runner` (`podman`, `shopware-cli` or `project-native`) and `commands`, an array
of argv arrays to run from that workspace. Include the existing `CartProcessorTest`
and PHPStan checks for core, project quality plus `custom/plugins/Example`
metadata for the shop, metadata for the standalone plugin, and its existing
`npm run check` for the unrelated site. Prefer machine-readable CLI results using
the available help. This is a plan only; execute none of the listed commands.
