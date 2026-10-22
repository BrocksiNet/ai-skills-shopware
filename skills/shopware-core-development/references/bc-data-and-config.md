# Backward compatibility of data, config and CLI (core)

Load when you change a DAL definition's API flags or associations, a feature
flag registration, a configuration default or key, or a console command.

None of these have a PHP signature, so no BC check notices the change.
Operators and integrations notice after the update. With the
ai-skills-shopware tools, `node tools/api-index/bin/api-diff.ts --repo .
--base origin/trunk --head HEAD` lists the routes, entity fields and flags,
feature flags and configuration keys a branch removes or changes without a
deprecation, and what it newly deprecates.

## Rules

- **CORE-066** **Keep the API shape of a definition.** A field or association
  that gains or loses `ApiAware`, or is renamed or removed, changes the Store
  and Admin API response for every client and generated SDK. Treat it like a
  response field change: add, deprecate, remove in the major.
- **CORE-067** **Do not drop an association or switch off `autoload`** on an
  existing definition in a minor. Templates, API clients and plugins that read
  the loaded data get `null` without an error.
- **CORE-068** **A feature flag keeps its default and name within a major.**
  Flipping the default, or renaming or removing a registered flag in
  `feature.yaml`, changes shops on update and drops the flag for plugins
  that check it. A deliberate flip needs a RELEASE_INFO entry and an UPGRADE
  entry with the opt-out.
- **CORE-069** **Configuration defaults, keys and environment variables stay.**
  A changed or removed default or key in `config.xml`, `shopware.yaml` or
  system config gives operators new behaviour they never chose, and a
  deployment that sets the old key silently loses it.
- **CORE-070** **Existing command invocations keep working.** Do not rename or
  remove an option, require a new one, or change the exit code or
  machine-readable output of a console command in a minor. Deploy scripts,
  cron jobs and health checks call it with fixed arguments.
- **CORE-071** **A new configuration key is findable.** Ship its default in the
  package YAML and in `config-schema.json`, not only in a bundle
  `Configuration.php` or the test configuration.
