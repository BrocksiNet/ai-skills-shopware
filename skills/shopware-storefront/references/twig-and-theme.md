# Twig, theme, and assets

Load when changing storefront templates, SCSS, or media.

## Templates

- Override via **Twig inheritance and named blocks**. Copying a whole core
  template into a theme is a last resort.
- Keep CMS / shopping-experience elements on their existing block structure
  so merchants can still compose them.
- User-facing strings: `{{ 'snippet.key'|trans }}`. No hardcoded copy.
- Forms: post to the existing storefront controller or a Store-API route,
  not a one-off unauthenticated POST. Do **not** add `sw_csrf` or a CSRF
  hidden field; 6.5+ relies on SameSite cookies and `sw_csrf` is gone.

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
