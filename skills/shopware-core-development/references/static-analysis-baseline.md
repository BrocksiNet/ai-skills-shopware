# PHPStan baseline discipline (core)

Load this when changing PHPStan configuration, the analysis level, or when you
hit baseline entries.

## The shrink-not-grow rule

The PHPStan baseline (`phpstan-baseline.neon`) is a record of *accepted legacy
debt*. It only ever gets smaller. Concretely:

- **Never add new entries to the baseline to silence your own new code.** Fix the
  code instead. New code must pass at the configured level cleanly.
- **When you touch a file that has baseline entries**, try to resolve them and
  remove those lines. Leave the file better than you found it.
- **Raising the level** (`level: X` in `phpstan.neon`) requires regenerating the
  baseline and committing it in the *same* change:

  ```bash
  vendor/bin/phpstan analyse --generate-baseline phpstan-baseline.neon
  ```

  Bumping the level without committing the regenerated baseline is the #1
  guardrail violation — refuse to do half of it.

## Writing analyzable code

Shopware's static-analysis guideline (see `php-foundation`) is the source of
truth. Key reminders for core:

- Narrow types with runtime checks or `assert()` before reaching for `@var`.
- `list<T>` over `array<int, T>`; precise generics on collections.
- The `shopwarelabs/phpstan-shopware` custom rules enforce platform-specific
  patterns — do not suppress them; satisfy them.

## Done

- [ ] No new baseline entries introduced by your change.
- [ ] Baseline entries in files you touched were reduced where feasible.
- [ ] If the level changed, the baseline was regenerated and committed together.
