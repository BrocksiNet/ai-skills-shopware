# Storefront JavaScript plugins

Load when adding or changing storefront JS.

## Register through PluginManager

Shopware looks for `Resources/app/storefront/src/main.js` and compiles it
into the storefront bundle. Register plugins there:

```js
import ScrollHintPlugin from './scroll-hint.plugin';

window.PluginManager.register('ScrollHint', ScrollHintPlugin, '[data-scroll-hint]');
```

- Extend the base `Plugin` class. Use `init()` / `destroy()`; do not attach
  a raw IIFE or a document-level jQuery ready handler for new code.
- Prefer **async register** (dynamic `import()` inside `PluginManager.register`)
  when the selector is not on every page — the plugin stays out of
  `storefront.js` until the selector exists.
- Selectors are `data-*` attributes. Do not bind new behavior to random
  Bootstrap class names that themes override.

## A shipped JS plugin is public API

- **SF-011** **Keep the registered name, public methods, emitted events and
  `static options` of a released JS plugin.** Themes set options through
  `data-*-options` attributes, overrides call methods with `super`, and other
  plugins subscribe to events. To rename, read the old option as a fallback,
  emit both events, and warn where the old name is used (not only in
  `init()`), until the next major. Phase out a helper other plugins import
  instead of deleting it.

## Stay inside the plugin system

- Do not add a second bundler or a `<script>` tag in Twig for feature JS
  unless you are loading an external pixel the theme cannot own.
- jQuery is legacy. New plugins are vanilla ES modules.
- Feature flags in storefront JS use `src/helper/feature.helper`
  (`Feature.isActive('v6.8.0.0')`), not a custom env sniff.
