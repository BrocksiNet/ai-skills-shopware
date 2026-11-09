# Shopware CLI routing

- **DEV-001** Select the runner from the actual Shopware project and requested operation. A linked `shopware-dev` checkout keeps its Podman/Mutagen or approved `sw-dev` verification route, including when a CLI config also exists. Use upstream Shopware CLI skills for CLI-managed Shopware projects and standalone extension checks; do not introduce Shopware tooling into unrelated projects. Discover the installed binary's version and relevant command help before selecting flags or commands.

## Establish the target

Inspect project metadata and the existing environment without printing secrets.
Core is identified by its Shopware package name or core source; plugins by
`shopware-platform-plugin`; apps by a Shopware app manifest; shop projects by
Shopware requirements or `.shopware-project.yml`. For a requested new Shopware
project, no existing marker is needed; follow the upstream creation skill.

Check the `shopware-dev (managed by sw-dev)` marker before choosing CLI over a
linked lane. Do not infer a runner from a folder name or CLI availability.
If environment ownership is unclear, resolve it before running checks.

## Discover capabilities, then propose checks

Use the same binary for version, help and execution. When deliberately testing
a CLI checkout, use its built binary consistently instead of mixing releases.

```bash
command -v shopware-cli
shopware-cli --version
shopware-cli project validate --help
shopware-cli extension validate --help
```

These are discovery examples; read only the command help relevant to the task.
Reporter flags differ across versions (`--format` versus `--reporter`), as can
subcommands and noninteractive options. Use the supported spelling. Do not
upgrade the CLI or bypass a failed command with reconstructed tool commands
just to match an example.

Choose checks by scope:

- `project validate` checks the configured project toolset. It does not establish
  each extension's manifest/metadata validity.
- `extension validate <path>` checks that extension. Select full validation,
  Store compliance and supported-version checks only when the task needs them.
- Keep existing targeted unit, integration, build and browser checks when they
  cover behavior the CLI validation does not exercise.

Before execution, include the selected runner, binary/version, working directory,
checks, proposed limits and side effects in the task plan. Validation runs in
the given folder and may install tools; PHPStan's Composer dependencies go to
`var/cache/shopware-cli` inside it, while an existing `vendor/` and
`composer.lock` stay untouched. `--no-copy` is deprecated and does nothing;
do not pass it. An inspection-only
request authorizes discovery and a plan, not validation, dependency installs,
formatting, project creation, database changes or account publication.

## Evidence for the next stage

Record the executed argv, version, selected tools, exit status, skipped checks
and candidate identity with the report. A JSON reporter formats findings; it
does not make skipped checks pass or authorize publication. Rerun affected
checks after source/environment changes. These skill instructions route work;
they do not implement a SoftwareFactory adapter or enable a pinned release.
