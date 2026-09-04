# HTTP cache, AJAX, and the modern-web gate

Load when the change hits cached storefront pages or when you are tempted
to apply a generic modern CSS/JS pattern.

## Cache-safe storefront JS

- Listing, product, home, and category pages are HTTP-cached. A plugin that
  fetches personalized data on every view must not poison that cache and
  must not block first paint for everyone.
- Prefer Store-API + cache tags (`CacheTagCollector` in PHP) over a
  storefront controller that always `no-store`.
- Account, cart, checkout, and wishlist are already private/session-ish.
  Do **not** add speculation rules, prerender, or prefetch that would pull
  those URLs in for anonymous users.

## Do not add

- `<script type="speculationrules">` (or equivalent prerender/prefetch) on
  cart, checkout, account, wishlist, or any URL that mutates session/cart.
- Cross-document view transitions on Twig navigations unless the user asked
  and cache + cart are accounted for.
- Replacing Bootstrap modal / offcanvas / collapse / dropdown with native
  `<dialog>`, Popover, or custom `<select>`.

## After Shopware primitives are exhausted

For a leftover platform API (LCP on the existing product image, INP in a
custom widget, container queries in custom SCSS), look up
[`modern-web-guidance.md`](../../shopware-research-and-escalation/references/modern-web-guidance.md)
and adapt the guide. The Shopware primitive still wins if both apply.
