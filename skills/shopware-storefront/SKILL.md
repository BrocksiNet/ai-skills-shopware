---
name: shopware-storefront
description: >-
  Apply Shopware 6 Storefront rules for Twig, themes, Bootstrap/SCSS, and
  PluginManager JS. Use when editing storefront templates, Twig blocks, theme
  inheritance, storefront JavaScript plugins, or storefront SCSS under
  src/Storefront, Resources/views/storefront, or Resources/app/storefront,
  including Twig 4 changes such as the removed spaceless filter and null HTML
  attributes. Do NOT use for Administration Vue/Jest (shopware-admin-js), PHP
  DAL/services (surface PHP skills), or generic modern CSS lectures (research
  + Modern Web Guidance after Shopware primitives are checked).
license: MIT
---

# Shopware Storefront

Rules for Twig storefront, themes, and storefront JS. The storefront is a
**Twig + Bootstrap + PluginManager** app, not a greenfield site. Inherits
nothing from `php-foundation`. PHP behind a storefront controller still uses
the PHP surface skills.

> **Upstream:** core has no storefront skill. Prefer this skill on every
> surface (plugin theme, project theme, `src/Storefront`).

Read only the reference that matches the task or the files it changes:

<!-- routes:start: generated from routes.json by `node tools/bin/render-routes.ts`; do not edit -->
| Read | When | Or the change touches |
| ---- | ---- | --------------------- |
| [`js-plugins.md`](references/js-plugins.md) | You write or register a storefront JS plugin. | `Resources/app/storefront/src/**/*.{js,ts}`, `PluginManager.register(`, … |
| [`twig-and-theme.md`](references/twig-and-theme.md) | You edit Twig blocks, the theme, snippets or assets. | `Resources/views/storefront/**/*.twig`, `Resources/app/storefront/src/scss/**`, `{% sw_extends`, … |
| [`cache-and-modern-web.md`](references/cache-and-modern-web.md) | Content depends on the user or cache, or you need a modern web API. | `CacheTagCollector`, … |
<!-- routes:end -->

## Hard guardrails

1. **SF-002** **Extend, do not replace.** Use Twig blocks, theme inheritance, and
   `PluginManager` plugins. Do not drop a new HTML/JS root next to the theme.
2. **SF-003** **Keep Bootstrap and existing storefront components** (modal, collapse,
   offcanvas, dropdown). Do not replace them with raw `<dialog>`, Popover API,
   or a custom select.
3. **SF-004** **No speculation rules or prerender** on cart, checkout, account, or
   wishlist.
4. **SF-005** **Cache shared listing, product, and home HTML.** Do not fire blocking
   AJAX on those pages for personalized data. Load genuinely private
   responses asynchronously after first paint; do not put `no-store` on
   the shared document.

## Storefront deltas

- **SF-006** New JS belongs in a `Plugin` subclass registered with `window.PluginManager`
  from `Resources/app/storefront/src/main.js`. Prefer async/dynamic register
  when the selector is page-specific.
- **SF-007** Visible text goes through snippets (`trans`), not hardcoded strings.
- **SF-008** Product / CMS images use Shopware media + thumbnails / `srcset`, not a
  one-off `<img>` with a hardcoded CDN URL.
- **SF-009** Storefront forms post to the existing storefront controller or a Store-API
  route. Do **not** add `sw_csrf` or a CSRF hidden field — Shopware 6.5+
  dropped storefront CSRF for SameSite cookies.
- **SF-010** **Twig 4 (Shopware 6.8) is stricter, not a new theme.** Remove the
  `spaceless` filter, give optional macro arguments defaults, and do not pass
  `null` as an HTML attribute. Details are in the Twig reference. PHP behind
  the template (cache, documents, flows) stays with `shopware-plugin-development`.

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
- [ ] Shipped Twig blocks, variables and template files keep working for themes (`SF-001`).
