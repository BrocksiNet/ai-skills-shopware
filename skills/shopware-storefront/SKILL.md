---
name: shopware-storefront
description: >-
  Shopware 6 Storefront (Twig, theme, Bootstrap/SCSS, PluginManager JS). Use
  when editing storefront templates, themes, storefront JavaScript plugins, or
  storefront SCSS — paths like src/Storefront, Resources/views/storefront,
  Resources/app/storefront. Triggers on "storefront JS plugin", "PluginManager",
  "Twig block", "theme inheritance", "storefront SCSS", "Bootstrap storefront".
  Do NOT use for Administration Vue/Jest (shopware-admin-js), PHP DAL/services
  (surface PHP skills), or generic modern CSS lectures (research + Modern Web
  Guidance after Shopware primitives are checked).
---

# Shopware Storefront

Rules for Twig storefront, themes, and storefront JS. The storefront is a
**Twig + Bootstrap + PluginManager** app, not a greenfield site. Inherits
nothing from `php-foundation`. PHP behind a storefront controller still uses
the PHP surface skills.

> **Upstream:** core has no storefront skill. Prefer this skill on every
> surface (plugin theme, project theme, `src/Storefront`).

Load a reference only when needed:

- JS plugins -> [`references/js-plugins.md`](references/js-plugins.md)
- Twig / theme / assets -> [`references/twig-and-theme.md`](references/twig-and-theme.md)
- HTTP cache vs AJAX; MWG gate -> [`references/cache-and-modern-web.md`](references/cache-and-modern-web.md)

## Hard guardrails

1. **Extend, do not replace.** Use Twig blocks, theme inheritance, and
   `PluginManager` plugins. Do not drop a new HTML/JS root next to the theme.
2. **Keep Bootstrap and existing storefront components** (modal, collapse,
   offcanvas, dropdown). Do not replace them with raw `<dialog>`, Popover API,
   or a custom select.
3. **No speculation rules or prerender** on cart, checkout, account, or
   wishlist.
4. **Do not ship blocking, uncached AJAX** on listing, product, or home
   unless the response is explicitly excluded from HTTP cache.

## Storefront deltas

- New JS belongs in a `Plugin` subclass registered with `window.PluginManager`
  from `Resources/app/storefront/src/main.js`. Prefer async/dynamic register
  when the selector is page-specific.
- Visible text goes through snippets (`trans`), not hardcoded strings.
- Product / CMS images use Shopware media + thumbnails / `srcset`, not a
  one-off `<img>` with a hardcoded CDN URL.
- Storefront forms post to the existing storefront controller or a Store-API
  route. Do **not** add `sw_csrf` or a CSRF hidden field — Shopware 6.5+
  dropped storefront CSRF for SameSite cookies.

## When to consult Modern Web Guidance

Only after the lists above have no primitive: LCP/`fetchpriority` on the
**existing** product image, INP on a custom widget, `:has()` / container
queries in **custom** SCSS. Then
[`shopware-research-and-escalation/references/modern-web-guidance.md`](../shopware-research-and-escalation/references/modern-web-guidance.md).
Adapt the guide. Do not paste a framework-agnostic demo into Twig.

## Definition of done

- [ ] Change goes through Twig block, theme, or `PluginManager` — not a parallel stack.
- [ ] No raw dialog/popover/select in place of Bootstrap storefront components.
- [ ] No speculation/prerender on cart, checkout, account, wishlist.
- [ ] Listing/product AJAX is cache-safe or explicitly uncached for a reason.
- [ ] Snippets for user-facing text; media helpers for images.
