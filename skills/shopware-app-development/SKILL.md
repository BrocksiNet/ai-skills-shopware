---
name: shopware-app-development
description: >-
  Rules for building Shopware apps — declarative extensions defined by a
  manifest.xml, not PHP services. Use when the target is an app: paths like
  custom/apps, a manifest.xml, app scripts (Resources/scripts/<hook>/*.twig),
  webhooks, Admin API access, or app registration / backend setup. Apps run
  sandboxed: there is no plugin DI container and no direct DAL / EntityRepository
  in the shop process — logic is declarative (manifest), sandboxed Twig app
  scripts, or an external backend reached via webhooks and the Admin API.
  Triggers on "build a Shopware app", "add a manifest.xml", "write an app
  script", "register a webhook", "app permissions", "app vs plugin", "Admin API
  from my app", "Meteor Admin SDK module". Do NOT use for PHP plugins
  (custom/plugins -> shopware-plugin-development), for the platform itself
  (shopware-core-development), or for generic PHP style (php-foundation).
---

# Shopware app development (declarative extension surface)

For **apps** — extensions defined by a `manifest.xml` under `custom/apps`, not
by PHP plugin classes. Apps are the right surface when the integration is
declarative, sandboxed, or backed by an **external** service. If the change
needs the full PHP runtime (custom DI services, PHP DAL entities, route
decoration), it is a **plugin** — use `shopware-plugin-development` instead.
Inherits `php-foundation` only for any backend code you write outside the shop.

Load a reference only when the task needs it:

- Manifest, permissions & lifecycle -> [`references/manifest-and-permissions.md`](references/manifest-and-permissions.md)
- App scripts (sandboxed Twig hooks) -> [`references/app-scripts.md`](references/app-scripts.md)

## Hard guardrails (refuse rather than violate)

1. **Never implement app logic as plugin-style PHP** (DI services, an
   `EntityRepository`/DAL call, route decoration, subscribers) **inside the
   shop process.** Apps have none of that at runtime. In-shop logic is sandboxed
   Twig **app scripts**; everything else lives in an external backend reached via
   webhooks + the Admin API. If the requirement genuinely needs in-process PHP,
   say so and recommend a plugin.
2. **Never request broader permissions or skip declared requirements.** Permissions
   in `manifest.xml` are least-privilege; a webhook or Admin API call fails without
   the matching permission. Declare `<requirements>` (e.g. `public-access`) the app
   truly needs.
3. **Never skip signature verification** on registration, webhook, and
   Admin-API-to-app traffic. The shared secret signs requests both ways; verify it.
4. **Keep the manifest valid and consistent.** The app folder name must equal
   `<meta><name>`; validate against the `manifest-3.0` schema; run
   `bin/console app:validate`. Do not hand-edit installed-app state in the DB.

## App deltas (what models get wrong about apps)

- **Declarative first.** Custom fields, config, action buttons, payment/tax/shipping
  integration, admin modules, and webhooks are declared in `manifest.xml` — not coded.
- **App scripts, not services.** In-process logic is Twig in
  `Resources/scripts/<hook-name>/*.twig`, executed sandboxed with only the
  services that hook exposes (introduced 6.4.8.0; lifecycle scripts 6.4.9.0).
  No arbitrary PHP, no container.
- **Communication model.** App → outside world via **webhooks**; outside world →
  shop via the **Admin API** with the registration-issued credentials. Heavy or
  stateful logic belongs in your external backend, not the shop.
- **Admin UI** is the **Meteor Admin SDK** (iframe modules, action buttons, main
  module entries) declared in the manifest — not Administration Vue plugins.
- **Lifecycle** is CLI/Administration driven: `app:refresh`, `app:install --activate`,
  `app:activate`, `app:validate`. App scripts can hook install/activate events.
- **No-backend vs backend apps.** A pure manifest + app-scripts + admin-UI app needs
  no server; registration/webhooks/signing are only required once the app talks to an
  external backend.

## Definition of done

- [ ] The work is genuinely declarative/sandboxed/external — not plugin PHP in disguise.
- [ ] `manifest.xml` valid against `manifest-3.0`; folder name equals `<meta><name>`; `app:validate` clean.
- [ ] Permissions are least-privilege; required `<requirements>` declared.
- [ ] In-shop logic is app scripts (correct `Resources/scripts/<hook>/` placement), not PHP services.
- [ ] Registration / webhook / Admin-API signatures verified; secrets not committed.
- [ ] Admin UI via Meteor Admin SDK where a UI is needed.

## Further reading (optional, non-load-bearing)

- Shopware developer docs:
  [App Base Guide](https://developer.shopware.com/docs/guides/plugins/apps/app-base-guide.html),
  [Apps overview](https://developer.shopware.com/docs/guides/plugins/apps/),
  [Manifest reference](https://developer.shopware.com/docs/resources/references/app-reference/manifest-reference.html),
  [App scripts](https://developer.shopware.com/docs/guides/plugins/apps/app-scripts/),
  [App registration & backend setup](https://developer.shopware.com/docs/guides/plugins/apps/lifecycle/app-registration-setup.html).
