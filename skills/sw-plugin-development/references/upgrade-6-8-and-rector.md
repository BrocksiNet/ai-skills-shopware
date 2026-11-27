# Shopware 6.8 preparation and Rector upgrades

Load when preparing a plugin for Shopware 6.8 without dropping older supported
minors, or when running Rector / Administration codemods for cross-version
upgrades. For general multi-version API checks (`shopware-api-index`), runtime
guards (`PLG-024`), optional packages (`PLG-032`), and Symfony XML-to-PHP
migration, see [`version-compatibility.md`](version-compatibility.md).

## Preparing for 6.8 without dropping the versions you support

The 6.8 scope is not frozen (fixed around the end of 2026, release targeted
for mid-2027). Do not treat a slide deck as the migration. Do not narrow
`composer.json` to 6.8 unless the user asked to drop a minor. Polyfills and
version-aware Rector transformations are not proof of a finished upgrade. Prefer
deprecation warnings and Shopware's future-compatibility rules when they
exist on the version you run. Do not transcribe them here.

What you can already check:

- PHP 8.5 is usable on 6.7.6.0 and 6.6.10.11. In 6.8 the temporary fallback
  for invalid locales goes away, so number formatting needs a valid locale.
- MySQL 8.4 and MariaDB 11.4 are already supported. Foreign keys must
  reference a complete primary or unique key.
- Symfony 8 removes XML service and route config (see
  [`version-compatibility.md`](version-compatibility.md)) and dynamic
  `$request->get()`. Read query, body, or route attributes. Mixed GET/POST goes
  through Shopware's `RequestParamHelper`.

How to test, on a shop that still supports the current minor:

- Start with a static scan for announced breaks. Shopware CLI 0.22 and later
  can do this: `shopware-cli extension validate <path> --check-against
  next-major --only phpstan` (or `project validate --check-against
  next-major` for a shop project). PHPStan reads the breaking-change
  attributes of the Shopware version it resolves and lists the code that
  uses them. Check `--help` of the installed binary first; older releases do
  not have the option. The scan finds API breaks only, not the behavior
  changes below.
- Keep the normal suite. Add a second run with `V6_8_0_0=1`.
- `FEATURE_ALL` enables later flags as well. It is not the 6.8 run.
- An explicit feature override can leave a linked flag (such as
  `CACHE_REWORK`) off even when the major flag is on.
- From 6.7.16, that flag is planned to select a **separate compiled
  container** so removed services fail in the test. That is how you find
  removals. It is not a container your plugin should ship. A production
  split is `sw-change-impact`.

Behavior that still compiles. Enable the matching flag in a test environment
and compare results. Confirm against the Shopware version you actually run:

- **`CACHE_REWORK`.** HTTP cache stays on for logged-in customers and filled
  carts. Selected Store API GET routes share it. Only cache-relevant rules
  vary it by default. Test personalized content, custom rules, and
  invalidation across customers and cart states.
- **Cart calculation.** Percentage discounts, surcharges, and split quantities
  reuse the taxes already calculated for the line item. Cent amounts can
  change. Compare what you send to ERP and accounting, including mixed tax
  rates and net/gross prices.
- **`DOCUMENT_GENERATION_REWORK`.** v2 becomes the default in 6.8. v1 remains
  a fallback until 6.9. Types and formats have separate extension points.
  Existing Twig document templates stay. PHP that hooks the old generator
  moves to the new extension points.
- **`FLOW_EXECUTION_AFTER_BUSINESS_PROCESS`.** Flows run after the request,
  message, or command finishes its main work, still in the same process. The
  operation can return before a flow action (such as mail) has run. A failing
  flow must not be what completes checkout. Transaction-critical work stays
  in a synchronous subscriber.

Storefront Twig 4 (`spaceless`, macro defaults, `null` HTML attributes) is
`sw-storefront`. An Administration Twig override is not migrated to the
experimental Vue single-file API for this upgrade; that refusal is
`sw-admin-js`.

## Upgrades & modernization (tooling, not hand-edits)

For cross-version migrations (e.g. 6.6 → 6.7) and PHP modernization, prefer
**Rector** over hand-editing — it is Shopware's own recommended upgrade tool:

- Consult [FriendsOfShopware/shopware-rector](https://github.com/FriendsOfShopware/shopware-rector)
  as the maintained source: its [rules overview](https://github.com/FriendsOfShopware/shopware-rector/blob/main/docs/rector_rules_overview.md)
  and [6.7 compatibility guide](https://github.com/FriendsOfShopware/shopware-rector/blob/main/docs/shopware-6.7.md)
  explain the transformations and their limits. Read the selected rule, set
  config and fixture at the package revision actually used. A rule namespace
  or set name alone does not establish compatibility with the oldest supported
  Shopware minor.
- Reuse installed `rector/rector` + `frosh/shopware-rector` and existing config.
  Propose adding dev dependencies only if missing and needed by the task.
  Pick the matching available Shopware/Symfony sets without narrowing the
  plugin's supported range; record their package versions and selected sets.
- Run **dry-run first** (`vendor/bin/rector process --dry-run`), **review the
  diff**, then apply — never trust a blind rewrite.
- For Administration JavaScript, use the Shopware **codemods**; Rector is PHP only.

Reference the tool and run it; do not transcribe its rules here — they are
maintained upstream and would go stale.

## Done (6.8 prep & Rector)

- [ ] Cross-version migration done via Rector (`frosh/shopware-rector` set), dry-run reviewed — not blind hand-edits.
- [ ] 6.8 prep kept the `composer.json` range unless a minor was explicitly dropped.
- [ ] The suite was considered with `V6_8_0_0=1` as well as without it, and `FEATURE_ALL` was not used as that run.
- [ ] Cache, cart totals, documents, or flows were called out when the plugin touches them.
