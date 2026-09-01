# Task: register storefront JS through PluginManager

`Resources/app/storefront/src/main.js` attaches a scroll listener with a
raw `document.addEventListener`. That is not a Storefront plugin.

- Move the behavior into a `Plugin` subclass (`ScrollHintPlugin`).
- Bind the scroll listener to `window` (the original behavior watches the
  viewport) and remove it in `destroy()`.
- Register it with `window.PluginManager.register(...)` and a `data-*`
  selector.
- Do not leave the document-level `addEventListener` in `main.js`.
