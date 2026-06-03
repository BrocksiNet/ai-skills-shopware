# Manifest, permissions & lifecycle (apps)

Load this when scaffolding an app, declaring what it may do, or wiring its
lifecycle.

## The manifest is the contract

An app is discovered from `custom/apps/<AppName>/` by its `manifest.xml`. The
folder name **must** equal `<meta><name>`. Pin the schema so validation works:

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

`<meta><name>`, `<label>`, `<version>` and `<license>` are required; an empty or
missing required field makes `bin/console app:refresh` fail.

## Permissions & requirements (least privilege)

- Declare only the entity permissions the app actually uses
  (`<permissions>` with read/create/update/delete per entity). A webhook or
  Admin API call without the matching permission is rejected.
- Declare `<requirements>` the app depends on — e.g. `<public-access/>` when the
  shop must be reachable from your backend. Shopware validates requirements on
  install in `prod` and rejects an install that cannot work, with a clear error.

## Setup (only for apps with a backend)

```xml
<setup>
    <registrationUrl>https://my.example.com/registration</registrationUrl>
    <secret>devSecretOnly</secret>
</setup>
```

Registration is a `GET` to your `registrationUrl`; the handshake exchanges a
shared secret used to sign all later traffic. A pure manifest + app-scripts app
needs no `<setup>` at all.

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

- [ ] Folder name equals `<meta><name>`; manifest pins the `manifest-3.0` schema.
- [ ] Required `<meta>` fields present; `app:validate` is clean.
- [ ] Permissions least-privilege; needed `<requirements>` declared.
- [ ] `<setup>`/secret present only if the app has a backend; secret not committed.
