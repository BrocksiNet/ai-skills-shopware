# Twig, theme, and assets

Load when changing storefront templates, SCSS, or media.

## Templates

- Override via **Twig inheritance and named blocks**. Copying a whole core
  template into a theme is a last resort.
- Keep CMS / shopping-experience elements on their existing block structure
  so merchants can still compose them.
- User-facing strings: `{{ 'snippet.key'|trans }}`. No hardcoded copy.
- **SF-009** **Forms post to the existing storefront controller or a
  Store-API route, without `sw_csrf` or a CSRF hidden field.** 6.5.0
  removed storefront CSRF for SameSite cookies, and with it the `sw_csrf()`
  Twig function: a template that calls it fails to compile with "Unknown
  function", so the page errors. Not a one-off unauthenticated POST either.

## What you ship is public API

Themes and other plugins extend the blocks of the templates your plugin
ships, read the variables you pass into them, and override your styles,
config and texts.

- **SF-001** **Deprecate before you rename, move or remove** a Twig block, a
  template variable or a template file that a released version shipped. Keep
  the old block wrapping the new one (or the old variable filled) with a
  `{# @deprecated tag:vX.0.0 #}` comment until the next major. A theme that
  overrides a removed block renders nothing and throws no error.
- **SF-012** **Keep SCSS variables and mixins, `is--*` state classes,
  `theme.json` config fields and snippet keys** that a released version
  shipped. A theme that sets a renamed variable or field silently falls back
  to the default; a renamed snippet key shows the raw key, and merchant
  translations of the old key are lost. Add the new name, keep the old one
  working until the next major.

## Theme / SCSS

- Theme config and Bootstrap SCSS variables first. Do not fork Bootstrap
  components for a color change.
- Prefer existing utility / component classes. New SCSS is BEM-ish and
  scoped to the plugin/theme prefix.
- Builds run in the project toolchain (container / `shopware-podman-dev`),
  never a host `npm run` against a different Node than the platform.

## Twig 4 (Shopware 6.8)

Twig 4 ships with 6.8. These are template breaks, not a reason to replace the
theme.

- Optional macro arguments need defaults. An argument with no default is
  required.
- Where operator precedence changed, add parentheses. Do not guess which
  expression Twig 3 happened to accept.
- Remove the `spaceless` filter. `{% apply spaceless %}` is the same filter
  and goes away with it. Use whitespace control (`{{-`, `-}}`) only where the
  space itself matters.
- Do not pass `null` as an HTML attribute. Twig 4 throws. Omit the attribute,
  or remove it with `attributes.remove()`.
- Custom components that use `cva` switch to `html_cva` and update lifecycle
  hooks. Shopware's own components are Shopware's to update.
- A custom Twig extension that subclasses parser or node classes needs a
  review against Twig 4. That is uncommon. Do not rewrite a normal block
  override because of it.

## Images

- Use Shopware media + thumbnail / `srcset` helpers for product and CMS
  images. `fetchpriority="high"` is allowed on the **known LCP** image
  (usually the product cover) after you confirm it is the LCP candidate.
- Decorative images stay decorative (`alt=""`, or CSS). Do not invent a
  second image pipeline.
