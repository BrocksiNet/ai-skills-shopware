# Task: register storefront JS through PluginManager

`Resources/app/storefront/src/main.js` attaches a scroll listener with a
raw `document.addEventListener`. That is not a Storefront plugin.

- Move the behavior into a `Plugin` subclass (`ScrollHintPlugin`).
- Bind the scroll listener with `window.addEventListener('scroll', ...)` and
  remove it with `window.removeEventListener` in `destroy()`.
- Register it with `window.PluginManager.register(..., '[data-scroll-hint]')`.
  The homepage template already owns that data attribute; keep the host.
- Do not leave the document-level `addEventListener` in `main.js`.
