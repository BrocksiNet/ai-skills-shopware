# App scripts (sandboxed Twig hooks)

Load this when an app needs logic that runs **inside** Shopware without an
external backend.

## What they are

App scripts are Twig files executed in a **sandboxed** environment inside the
Shopware execution stack (introduced in 6.4.8.0; app lifecycle scripts in
6.4.9.0). They are not arbitrary PHP: a script only sees the data and the
pre-defined services that its **hook** exposes.

## Placement and sandbox rules

- **APP-005** Place every app script under `Resources/scripts/<hook-name>/*.twig`
  matching the exact Shopware hook directory (and shared partials in
  `Resources/scripts/include/`), and call only the variables and services that
  hook exposes. Scripts placed directly in `Resources/scripts/` or under an
  invented folder name never run; Symfony container access, arbitrary PHP, and
  unexposed DAL repositories do not exist in the Twig sandbox.

```text
└── MyExampleApp
    ├── Resources
    │   └── scripts
    │       ├── product-page-loaded
    │       │   └── add-data.twig          // runs on the product-page-loaded hook
    │       ├── cart
    │       │   ├── first.twig
    │       │   └── second.twig            // multiple scripts per hook allowed
    │       └── include
    │           └── helpers.twig           // shared partials, included by others
    └── manifest.xml
```

## Additional guidance

- **Keep scripts deterministic and cheap.** They run in request/cart/indexing
  paths; heavy or external work belongs in a backend reached via webhooks.
- **Reuse via `include/`.** Put shared logic in `Resources/scripts/include` and
  `{% include %}` it rather than copy-pasting across hooks.
- **Lifecycle scripts** (`app.activated`, `app.deactivated`, …) can seed or clean
  up data on install/activate without an external server.

## Done

- [ ] Script lives under `Resources/scripts/<hook-name>/` with the exact hook name (`APP-005`).
- [ ] Only the hook's exposed data/services are used; no assumed container/DAL (`APP-005`).
- [ ] Shared logic factored into `include/`; scripts stay light.
