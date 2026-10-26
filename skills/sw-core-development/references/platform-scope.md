# Platform scope (core)

Load when a change adds a configuration option, an environment probe, or
code for one product or hosting setup to Core, Storefront or Administration.

Every shop carries what core ships. An option or special case stays forever
and doubles the test matrix.

## Rules

- **CORE-072** **No option for one hosting variant.** A new config key, env var,
  command flag or changed default whose only reason is one hosting setup is
  not core's to carry. Document the requirement instead. An option is fine
  when two supported setups need different behaviour.
- **CORE-073** **No silent environment probes.** `getenv()`, `ini_get()`,
  `is_writable()`, `function_exists()` or `class_exists()` that quietly switch
  behaviour make two shops on the same version behave differently. Use a
  documented config key or env var, or fail with a clear error at install or
  boot.
- **CORE-074** **No code for one product or integration in core.** SaaS or
  Commercial keys, direct calls into one integration, or a default changed for
  every shop because one extension misbehaves belong behind a generic
  extension point or event that the product uses.

## Eval

`review-environment-probe-catch` / `-ignore` (CORE-073).
