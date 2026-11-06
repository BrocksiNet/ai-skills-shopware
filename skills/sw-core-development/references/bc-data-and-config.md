# Backward compatibility of data, config and CLI (core)

Load when you change a DAL definition's API flags or associations, a feature
flag registration, a configuration default or key, or a console command.

None of these have a PHP signature, so no BC check notices the change.
Operators and integrations notice after the update. This skill ships
`scripts/shopware-api.mjs`, one file next to the `references/` folder. Run
it with plain Node from the root of the shopware/shopware clone:

```bash
node <this-skill-folder>/scripts/shopware-api.mjs diff --repo . --base origin/trunk --head HEAD
```

It lists the routes, entity fields and flags, feature flags, configuration
keys, admin components, props and blocks, storefront templates, blocks and
JS plugins, and Twig functions the branch removes or changes without a
deprecation, and what it newly deprecates, each with `[file:line]`. The
second line is the summary. Exit code 3 means a breaking change was found;
0 means none. A method a parent class took over and a class moved with
`#[ClassMoved]` and a runtime alias are listed as `moved`, not as breaks.
A template block whose body changed is listed as `body changed`, not as a
break: check that extensions overriding it with copied markup still fit.

- **Clone mode** (`--repo .`): base and head are git refs. Use it for your
  branch, with `--base` set to the branch the PR targets.
- **Release mode** (no `--repo`): base and head are releases such as
  `6.6.10.4` and `6.7.0.0`, or `trunk`, from the weekly index the script
  downloads. Use it to see what an earlier release already removed.
- **No Node 20 or newer** (`node --version`): the script refuses to run.
  Read `git diff origin/trunk...HEAD` for the files below by hand, and say
  that the API diff did not run.

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
