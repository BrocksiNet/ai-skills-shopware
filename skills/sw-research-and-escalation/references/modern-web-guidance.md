# Modern Web Guidance (default frontend companion)

Load this when the question is a **generic** modern CSS / HTML / client-JS
platform API (LCP/INP/CLS, container queries, `:has()`, focus and a11y,
autofill, view transitions, CSP) and Shopware does not already own a
primitive for it.

[Modern Web Guidance](https://github.com/GoogleChrome/modern-web-guidance)
(MWG) is a separate skill plus a local CLI with 200+ guides. We do **not**
vendor it. Install it next to our skills as a companion; the Shopware rules
below decide who wins when both apply.

## Install

```bash
npx skills add GoogleChrome/modern-web-guidance --skill modern-web-guidance
```

Take only `modern-web-guidance`. The repo also ships `chrome-extensions`,
which Shopware work does not need. The upstream wizard
(`npx modern-web-guidance@latest install`) is the alternative. The CLI needs
Node.js 22 or later. Set `DISABLE_TELEMETRY=1` in your shell profile if the
team does not want anonymous usage data sent to Google.

## Who wins

The MWG skill claims every HTML/CSS/JS task. Shopware rules come first:

1. **Storefront primitives win.** Bootstrap components (`SF-003`), Twig
   blocks, theme inheritance and `PluginManager` plugins (`SF-002`) beat an
   MWG pattern for dialogs, popovers, dropdowns, collapses, offcanvas and
   selects.
2. **Cache and session safety win.** No speculation rules or prerender on
   cart, checkout, account or wishlist (`SF-004`).
3. **Admin primitives win.** `mt-modal`, `mt-popover`, `mt-banner`,
   `mt-select` and the `sw-*` components already in the file beat a raw
   `<dialog>`, Popover API or custom `<select>`.
4. **Use MWG for everything Shopware does not own.** LCP/INP/CLS, container
   queries, `:has()`, custom SCSS layout, typography and color, focus and
   a11y, form UX, CSP/Trusted Types, scroll behavior.

Storefront and Admin tasks still start in `sw-storefront` or `sw-admin-js`.

## How to use it

```bash
npx -y modern-web-guidance@latest search "<what you want to achieve>"
npx -y modern-web-guidance@latest retrieve "<guide-id>"
```

Run `search`, then `retrieve` the best match, then **adapt** it to Twig,
SCSS or Vue. Do not paste a framework-agnostic demo into a template.
Allowlist `npx -y modern-web-guidance@latest *`, never bare `npx *`.

- **`.mwgrc`** is an optional JSON file in the project root (or `~/.mwgrc`).
  `allowOriginTrials` and `allowVolatileFeatures` unlock guides that `search`
  lists but `retrieve` withholds by default. Leave both off for shipped
  extensions; turn one on only when the user asks.
- **`legacy-scan`** looks for old patterns across a codebase. Run it only for
  a broad modernization request, never on a focused feature or bug fix.
- Allow **Baseline widely available** features as progressive enhancement.

## Skip MWG entirely for

- Built-in on-device AI, WebMCP, passkeys (unless the user asked).
- Replacing Bootstrap dropdowns / modals / collapses.
- Replacing `mt-modal`, `mt-popover`, or other Meteor components.
- Cross-document view transitions on cached Twig storefront navigations
  without a measured need.
