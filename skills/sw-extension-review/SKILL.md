---
name: sw-extension-review
description: >-
  Review a Shopware plugin or app diff as a whole before it merges or ships.
  Use for "review my plugin PR", "review this diff" in custom/plugins or
  custom/apps, "is this plugin safe to release", "check this before the
  Store submission", or a findings list with rule IDs and severities for an
  extension change. It picks the rules by changed path and reports what
  breaks a real shop. Do NOT use for shopware/shopware core PRs (core
  sw-review owns those), for answering review threads (sw-pr-review),
  for writing or fixing the code, or for the blast radius of a finished
  feature (sw-change-impact).
license: MIT
metadata:
  contexts: plugin app project
  tasks: review
  load_for: review
---

# Extension review (plugin and app diffs)

Review the diff the way a maintainer of a shop with fifty other plugins
would. This skill owns the workflow only. Each rule stays with its topic
skill; the routes below load those skills' references, so a rule changes in
one place.

Read the references the change selects:

<!-- routes:start: generated from routes.json by `node tools/bin/render-routes.ts`; do not edit -->
| Read | When | Or the change touches |
| ---- | ---- | --------------------- |
| [`lenses.md`](references/lenses.md) | Any review: backward compatibility, cache, queue, security and test questions, and the core-only rules to skip. | any change |
| [`output.md`](references/output.md) | Writing the findings. | any change |
| [`plugin-development: dal-usage.md`](../sw-plugin-development/references/dal-usage.md) | You read or write data through the DAL. | `*Definition.php`, `*Entity.php`, `new Criteria(`, … |
| [`plugin-development: api-contracts.md`](../sw-plugin-development/references/api-contracts.md) | You add or change a Store-API or Admin route, its response struct, or its OpenAPI schema. | `StoreApi/**/*.php`, `Resources/Schema/**`, `#[Route(`, … |
| [`plugin-development: cache-tags.md`](../sw-plugin-development/references/cache-tags.md) | A change affects cached pages or needs cache tags (6.7+). | `CacheTagCollector`, … |
| [`plugin-development: migrations.md`](../sw-plugin-development/references/migrations.md) | You add or change a database migration. | `Migration/Migration*.php`, `extends MigrationStep`, … |
| [`plugin-development: version-compatibility.md`](../sw-plugin-development/references/version-compatibility.md) | The plugin must support more than one Shopware minor, or runs without a package it only suggests. | `composer.json`, `Resources/config/services.xml`, `"shopware/core"`, … |
| [`plugin-development: symfony-first.md`](../sw-plugin-development/references/symfony-first.md) | You are about to write code a Symfony component already provides. | `file_put_contents(`, … |
| [`app-development: manifest-and-permissions.md`](../sw-app-development/references/manifest-and-permissions.md) | You edit the manifest, permissions or app lifecycle. | `manifest.xml`, `app:(install\|refresh\|activate\|validate)` |
| [`app-development: app-scripts.md`](../sw-app-development/references/app-scripts.md) | You write an app script. | `Resources/scripts/**/*.twig` |
| [`security: secrets-and-config.md`](../sw-security/references/secrets-and-config.md) | Code reads a secret, an access key or a config value. | `.env`, `.env.*`, `sw-access-key\|SW_ACCESS_KEY`, … |
| [`security: api-acl-and-input.md`](../sw-security/references/api-acl-and-input.md) | You add or change a route, an ACL privilege or user input handling. | `#[Route(`, … |
| [`security: apps-and-webhooks.md`](../sw-security/references/apps-and-webhooks.md) | An app or webhook sends or receives data. | `manifest.xml`, `shopware-(shop\|app)-signature`, … |
| [`storefront: js-plugins.md`](../sw-storefront/references/js-plugins.md) | You write or register a storefront JS plugin. | `Resources/app/storefront/src/**/*.{js,ts}`, `PluginManager.register(`, … |
| [`storefront: twig-and-theme.md`](../sw-storefront/references/twig-and-theme.md) | You edit Twig blocks, the theme, snippets or assets. | `Resources/views/storefront/**/*.twig`, `Resources/app/storefront/src/scss/**`, `{% sw_extends`, … |
| [`storefront: cache-and-modern-web.md`](../sw-storefront/references/cache-and-modern-web.md) | Content depends on the user or cache, or you need a modern web API. | `CacheTagCollector`, … |
| [`admin-js: architecture.md`](../sw-admin-js/references/architecture.md) | You add a module, component override or ACL privilege. | `Resources/app/administration/src/module/**`, `Resources/app/administration/src/**/acl/index.{js,ts}`, `Shopware.Module.register(`, … |
| [`admin-js: extension-api.md`](../sw-admin-js/references/extension-api.md) | You change a shipped component, template block or position identifier. | `blocks-list.json`, `positionIdentifier`, … |
| [`architecture: symfony-in-shopware.md`](../sw-architecture/references/symfony-in-shopware.md) | You reach for a Symfony component or container feature, or a service keeps state in a property. | `HttpClientInterface`, … |
| [`core-development: deprecations.md`](../sw-core-development/references/deprecations.md) | You deprecate or break a public API. | `@deprecated tag:v`, … |
| [`core-development: removals-and-shims.md`](../sw-core-development/references/removals-and-shims.md) | You deprecate or remove an API, or add code that only lives until the next major. | `@deprecated tag:v`, … |
| [`core-development: static-analysis-baseline.md`](../sw-core-development/references/static-analysis-baseline.md) | You touch the PHPStan baseline or suppress a PHPStan error. | `phpstan-baseline.neon`, `phpstan*.neon`, `@phpstan-ignore`, … |
| [`change-impact: impact-review.md`](../sw-change-impact/references/impact-review.md) | The extension caches a computed value under its own key. | `Contracts\Cache\(CacheInterface\|TagAwareCacheInterface)`, … |
| [`architecture: extension-mechanisms.md`](../sw-architecture/references/extension-mechanisms.md) | You choose between an event, a decoration and a core edit, or change an event. | `*Event.php`, `Resources/config/services.{xml,php}`, `decorates`, … |
| [`architecture: dal-contracts.md`](../sw-architecture/references/dal-contracts.md) | You touch a DAL definition, entity or repository contract. | `*Definition.php`, `*EntityExtension.php`, `extends (Entity\|EntityTranslation\|MappingEntity)Definition`, … |
| [`review-learnings: api-aware.md`](../sw-review-learnings/references/api-aware.md) | The code serves Store-API or headless clients. | `StoreApi/**/*.php`, `SalesChannel/**/*Route.php`, `store-api`, … |
| [`review-learnings: dal-and-performance.md`](../sw-review-learnings/references/dal-and-performance.md) | The code queries the DAL, checks what a customer can see, runs on a hot path, or dispatches queued work. | `new Criteria(`, … |
| [`review-learnings: pr-size.md`](../sw-review-learnings/references/pr-size.md) | Any review of a change: the changed-line count and whether it bundles separate concerns. | any change |
| [`review-learnings: version-guards.md`](../sw-review-learnings/references/version-guards.md) | The change adds or keeps a class_exists or method_exists check for Shopware API. | `(class\|method\|interface)_exists((\?Shopware\b\|[A-Z][A-Za-z]+::class)` |
| [`review-learnings: feature-flags.md`](../sw-review-learnings/references/feature-flags.md) | The change reads a Shopware feature flag, or an environment variable that may be one. | `getenv(`, … |
| [`review-learnings: code-comments.md`](../sw-review-learnings/references/code-comments.md) | The change adds or edits comments or docblocks that talk about earlier versions, removed code or the issue. | `^\s*(//\|#\|*\|/*).*\b([Pp]reviously\|[Oo]riginally\|used to\|no longer (used\|needed\|necessary\|required\|called\|supported\|exists?\|works?\|applies)\|[Ee]arlier (version\|revision\|approach)\|[Bb]efore this (change\|PR\|fix)\|this (PR\|pull request)\|was (changed\|replaced\|removed) (to\|in\|with)\|instead of the old)\b`, … |
| [`review-learnings: change-scope.md`](../sw-review-learnings/references/change-scope.md) | A fix grows beyond the bug. | on demand |
| [`testing: test-shape-and-flags.md`](../sw-testing/references/test-shape-and-flags.md) | You need data providers, feature flags or coverage attributes, or a change edits an assertion. | `#[DataProvider(`, … |
| [`testing: integration-repository.md`](../sw-testing/references/integration-repository.md) | An integration test reads or writes through a repository. | `tests/integration/**/*Test.php`, `IntegrationTestBehaviour` |
| [`testing: exception-assertions.md`](../sw-testing/references/exception-assertions.md) | A test asserts an exception. | `->expectException(Object\|Message\|Code)?(` |
<!-- routes:end -->

## Workflow

1. **Collect the diff.** `git diff <base>...HEAD` for a branch, `gh pr diff
   <number>` for a pull request. Read the touched files before the change
   too: a removed block, a narrowed `WHERE` or a renamed option only shows
   as a problem next to the code that used it.
2. **Classify the changed paths by surface:** plugin PHP, migration, Store
   API or Admin API route, storefront (Twig, JS, SCSS, snippets),
   administration, app manifest or app script, tests. A change can touch
   several.
3. **Select the references** from the table above: a row applies when the
   change touches its globs or adds or removes a line matching its anchor.
   Always read [`lenses.md`](references/lenses.md): the backward
   compatibility and cache questions apply to any PHP or storefront change,
   whether a reference is selected or not. Open each reference by its path
   next to this skill (`../<skill>/references/<file>.md`). Skill folders are
   often symlinks that file search does not follow, so a search that lists
   nothing does not mean the file is missing. Only a path that fails to open
   is a skill that is not installed: skip it and say which surface you could
   not check.
4. **Check each selected rule** against the diff. Report a rule only when
   it applies to an extension; [`lenses.md`](references/lenses.md#core-only-rules)
   lists the core-only rules in the borrowed references.
5. **Write each finding** with the rule ID, the file and line, and the
   concrete failure on a real shop: which request, which worker, which
   other extension, which merchant edit. "Could be a problem" is not a
   finding.
6. **Do not flag** what ECS, PHPStan, `bin/console lint:container` or
   `shopware-cli extension validate` already report on this extension.
   Drop style comments unless asked; drop findings outside the diff unless
   the diff makes them worse.
7. **Hand off.** The blast radius of the feature as a whole (who pays when
   it is off, shared HTTP cache, one container) goes to
   `sw-change-impact`. Store listing and compliance checks go to the
   `shopware-cli-extension-store` skill when it is installed.

## Severity

| Severity | Meaning |
| -------- | ------- |
| blocking | Data loss, a security hole, or a removal without deprecation in an API other extensions use |
| major | Breaks shops behind the HTTP cache, with workers, or with other extensions; overwrites merchant edits |
| minor | Correct, but costly or fragile |
| nit | Style; only when asked |

Rate the failure, not the rule: the same rule can be `major` in a
released extension and `minor` in code nobody else extends.

## Output

End with the findings block from [`output.md`](references/output.md). An
empty list is a valid review; say what you checked instead of inventing a
finding.
