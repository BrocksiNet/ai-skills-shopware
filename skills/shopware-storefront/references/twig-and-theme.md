# Twig, theme, and assets

Load when changing storefront templates, SCSS, or media.

## Templates

- Override via **Twig inheritance and named blocks**. Copying a whole core
  template into a theme is a last resort.
- Keep CMS / shopping-experience elements on their existing block structure
  so merchants can still compose them.
- User-facing strings: `{{ 'snippet.key'|trans }}`. No hardcoded copy.
- Forms: keep the platform CSRF field and post to the existing storefront
  controller or a Store-API route — not a one-off unauthenticated POST.

## Theme / SCSS

- Theme config and Bootstrap SCSS variables first. Do not fork Bootstrap
  components for a color change.
- Prefer existing utility / component classes. New SCSS is BEM-ish and
  scoped to the plugin/theme prefix.
- Builds run in the project toolchain (container / `shopware-podman-dev`),
  never a host `npm run` against a different Node than the platform.

## Images

- Use Shopware media + thumbnail / `srcset` helpers for product and CMS
  images. `fetchpriority="high"` is allowed on the **known LCP** image
  (usually the product cover) after you confirm it is the LCP candidate.
- Decorative images stay decorative (`alt=""`, or CSS). Do not invent a
  second image pipeline.
