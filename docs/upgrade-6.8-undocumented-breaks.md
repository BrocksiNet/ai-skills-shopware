# 6.8 breaks the UPGRADE file does not name

`check-breaks` compares the public API index of `v6.7.0.0` with trunk and
matches every reported break against the headings in `UPGRADE-6.8.md`. Each
unmatched report was checked by hand against the source. This page lists the
25 confirmed as real breaks: trunk changes them, `UPGRADE-6.8.md` has no entry
for them, and `v6.7.0.0` carries no deprecation for them.

The list is a readable copy of the 6.8 entries in the `confirmed` section of
[`tools/api-index/known-breaks.json`](../tools/api-index/known-breaks.json),
as of 2026-10-23. The JSON stays the source of truth.

Line numbers refer to `v6.7.0.0` and to trunk at the time of the check.
Commits are in [`shopware/shopware`](https://github.com/shopware/shopware).

## Entity fields: type changes

The SEO fields were limited in [`b578add4802`](https://github.com/shopware/shopware/commit/b578add4802).
A `LongTextField` became a `StringField`, so longer values are now rejected by
the write validation. Extensions and imports that write long meta texts, alt
texts or keywords fail where they used to succeed. The base tag has no
deprecation for any of them.

| Field | Before (`v6.7.0.0`) | Trunk |
| ----- | ------------------- | ----- |
| `category_translation.metaTitle` | `LongTextField('meta_title')`, `CategoryTranslationDefinition.php:62` | `StringField`, `:71` |
| `category_translation.metaDescription` | `LongTextField('meta_description')`, `:63` | `StringField`, `:72` |
| `category_translation.keywords` | `LongTextField('keywords')`, `:64` | `StringField`, `:73` |
| `landing_page_translation.metaTitle` | `LongTextField('meta_title')`, `LandingPageTranslationDefinition.php:52` | `StringField`, `:54` |
| `landing_page_translation.metaDescription` | `LongTextField('meta_description')`, `:53` | `StringField`, `:55` |
| `landing_page_translation.keywords` | `LongTextField('keywords')`, `:54` | `StringField`, `:56` |
| `media_translation.alt` | `LongTextField('alt')`, `MediaTranslationDefinition.php:48` | `StringField`, `:50` |

`product_manufacturer.link` changed from a plain `StringField('link')` to a
`TranslatedField('link')`, both `ApiAware`. It lives in
`ProductManufacturerDefinition.php:62` on the base and `:64` on trunk. Code
that reads or writes `link` on the manufacturer entity directly, or uses raw
SQL on `product_manufacturer.link`, now has to go through the translation.
The base definition and entity carry no deprecation.

## Entity fields: flags added or removed

These fields keep their type but gain or lose a flag. A new `Immutable` flag
rejects updates after create. A new `WriteProtected(Context::SYSTEM_SCOPE)`
flag rejects writes outside the system scope, which includes the Admin API
and most extension code. None of them is deprecated on the base.

| Field | Before (`v6.7.0.0`) | Trunk | Effect |
| ----- | ------------------- | ----- | ------ |
| `customer.hash` | `StringField('hash')` with `ApiAware`, `CustomerDefinition.php:125` | no `ApiAware`, `:136` | No longer in Store API or Admin API responses |
| `custom_field.name` | `Required`, `CustomFieldDefinition.php:59` | adds `Immutable`, `:65` | Renaming a custom field fails |
| `custom_field.type` | `Required`, `:60` | adds `Immutable`, `:66` | Changing a custom field's type fails |
| `custom_field_set.name` | `Required`, `CustomFieldSetDefinition.php:61` | adds `Immutable`, `:65` | Renaming a custom field set fails |
| `plugin.managedByComposer` | `BoolField('managed_by_composer')`, `PluginDefinition.php:61` | adds `WriteProtected(SYSTEM_SCOPE)`, `:62` | Write only in system scope |
| `plugin.path` | `StringField('path')`, `PluginDefinition.php:62` | adds `WriteProtected(SYSTEM_SCOPE)`, `:63` | Write only in system scope |
| `webhook.appId` | `FkField('app_id')`, `WebhookDefinition.php:64` | adds `WriteProtected(SYSTEM_SCOPE)`, `:81` | Write only in system scope |

## Admin API routes removed

The controllers behind these routes are marked `@internal`, the app URL ones
for use by the app system only. They were still callable over HTTP and
carried no deprecation, so integrations that called them break.

| Route | Base location | Removed in | Replacement |
| ----- | ------------- | ---------- | ----------- |
| `api.app_system.app-url-change-strategies` | `AppUrlChangeController.php:32` | [`6bb1d687065`](https://github.com/shopware/shopware/commit/6bb1d687065) | `ShopIdController` |
| `api.app_system.app-url-change-resolve` | `AppUrlChangeController.php:40` | `6bb1d687065` | `ShopIdController` |
| `api.app_system.app-url-difference` | `AppUrlChangeController.php:58` | `6bb1d687065` | `ShopIdController` |
| `api.usage_data.get_consent` | `ConsentController.php:37` | [`1d47cf27f8c`](https://github.com/shopware/shopware/commit/1d47cf27f8c) | new consent system |
| `api.usage_data.accept_consent` | `ConsentController.php:53` | `1d47cf27f8c` | new consent system |
| `api.usage_data.revoke_consent` | `ConsentController.php:66` | `1d47cf27f8c` | new consent system |
| `api.usage_data.hide_consent_banner` | `ConsentController.php:79` | `1d47cf27f8c` | new consent system |

## Storefront routes moved

The route names stay, but the paths moved under `/_esi/global/` in
[`80b7e7394a6`](https://github.com/shopware/shopware/commit/80b7e7394a6).
Hard-coded URLs, reverse proxy rules, ESI cache rules and tests that request
`/header` or `/footer` stop matching. Code that builds the URL from the route
name is unaffected.

| Route | Before (`v6.7.0.0`) | Trunk |
| ----- | ------------------- | ----- |
| `frontend.header` | `/header`, `NavigationController.php:75` | `/_esi/global/header` |
| `frontend.footer` | `/footer`, `NavigationController.php:88` | `/_esi/global/footer`, `NavigationController.php:143` |

## Configuration

`shopware.feature.flags.*.major` changed from
`booleanNode('major')->defaultFalse()` (`Configuration.php:339`) to
`stringNode('major')->cannotBeEmpty()` with a check against the pattern
`v\d+.\d+.0.0` (trunk `:675`). A feature flag defined with `major: true` in a
`feature.yaml` or a bundle configuration is now rejected. It needs a version
string such as `v6.8.0.0`. The base has no deprecation.

## Keeping this page current

When `check-breaks` reports a new unmatched break, confirm it against the
source and add it to `confirmed` in `known-breaks.json` with its evidence.
Then update this page. See
[`docs/maintenance.md`](maintenance.md) for the weekly `api-index` workflow
that runs the check.
