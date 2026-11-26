# Manifest, permissions & lifecycle (apps)

Load this when scaffolding an app, declaring what it may do, wiring its
lifecycle or registration handshake, or checking whether a feature belongs in
an app at all.

## The manifest is the contract

An app is discovered from `custom/apps/<AppName>/` by its `manifest.xml`.

- **APP-001** Match the app folder name (`custom/apps/<AppName>/`) exactly to
  `<meta><name>`, pin the `manifest-3.0.xsd` schema, and fill all required
  `<meta>` fields (`<name>`, `<label>`, `<version>`, `<author>`, `<license>`).
  A mismatched folder name, older schema (`manifest-1.0.xsd` /
  `manifest-2.0.xsd`), or missing required field breaks `app:refresh` /
  `app:validate`.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<manifest xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
          xsi:noNamespaceSchemaLocation="https://raw.githubusercontent.com/shopware/shopware/trunk/src/Core/Framework/App/Manifest/Schema/manifest-3.0.xsd">
    <meta>
        <name>MyExampleApp</name>
        <label>My Example App</label>
        <version>1.0.0</version>
        <author>...</author>
        <license>MIT</license>
    </meta>
</manifest>
```

## Permissions, requirements & setup

- **APP-002** Match declared `<permissions>` to the webhooks and Admin API
  entities the app uses (keep them least-privilege, see `SEC-004`), declare
  every runtime requirement in `<requirements>` (such as `<public-access/>`
  when an external backend must reach the shop), and include `<setup>` only
  when the app has an external backend. A webhook whose event entity is missing
  from `<permissions>` is not dispatched; a `<setup>` block on a no-backend
  app fails `app:install` trying to reach a nonexistent server.
- Shopware validates `<requirements>` on install in `prod` and rejects an
  install that cannot work, with a clear error.
- For Store / production apps, omit `<secret>` from the committed
  `manifest.xml` (Shopware supplies it via the Store); use `<secret>` only for
  local dev registration and never commit a production secret (see `SEC-001`).

## App architecture boundaries (no plugin PHP, no Vue plugin bundles)

- **APP-003** Never ship plugin-style PHP services, Symfony DI configuration
  (`services.xml` / `services.php`), PHP event subscribers, or direct DAL
  `EntityRepository` code inside an app (`custom/apps/`). Apps have no
  in-process PHP container: put in-shop logic in sandboxed app scripts
  (`Resources/scripts/<hook>/*.twig`) and external logic in a backend reached
  via webhooks and the Admin API. If the requirement genuinely needs in-process
  PHP, build a plugin (`sw-plugin-development`) instead.
- **APP-004** Build app Administration UI with Meteor Admin SDK entries
  declared in `manifest.xml` (`<admin><module>`, `<main-module>`,
  `<action-button>`), not Administration Vue plugin bundles
  (`Resources/app/administration/src/main.js`, `Shopware.Module.register`,
  `Shopware.Component.register`). Shopware does not compile or boot plugin
  Administration JS bundles for apps.

## Registration handshake & signing (backend apps only)

```xml
<setup>
    <registrationUrl>https://my.example.com/registration</registrationUrl>
</setup>
```

- **APP-006** Complete the Shopware app registration handshake by verifying the
  `shopware-app-signature` header on the incoming `GET` registration request
  against the raw query string and app secret with constant-time comparison,
  returning a JSON `proof` (HMAC-SHA256 of `shop-id` + `shop-url` + app name)
  together with `secret` and `confirmation_url`, and persisting the per-shop
  `apiKey` / `secretKey` from the signed confirmation `POST` for later Admin
  API and webhook requests. Verify `shopware-shop-signature` on incoming
  webhooks (see `SEC-006`) and never commit production secrets (see `SEC-001`).
- A pure manifest + app-scripts app needs no `<setup>` at all.

## Lifecycle (CLI / Administration)

```bash
bin/console app:refresh                    # discover manually-added apps
bin/console app:install --activate MyExampleApp
bin/console app:activate MyExampleApp      # if installed inactive
bin/console app:validate                   # catch manifest/config problems
```

Use the technical name (`<meta><name>`), never a filesystem path. `--no-validate`
exists for debugging only.

## Done

- [ ] Folder name equals `<meta><name>`; manifest pins `manifest-3.0.xsd` and required `<meta>` fields (`APP-001`).
- [ ] Permissions match declared webhooks/Admin API calls (`SEC-004`, `APP-002`); needed `<requirements>` declared; `<setup>` present only with a backend.
- [ ] No plugin-style PHP services/DI/DAL (`APP-003`) or Administration Vue bundles (`APP-004`) inside `custom/apps/`.
- [ ] Registration handshake verifies `shopware-app-signature`, returns HMAC `proof`, and stores per-shop credentials (`APP-006`, `SEC-006`, `SEC-001`).
