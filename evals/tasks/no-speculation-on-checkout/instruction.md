# Task: remove speculation rules from checkout

`checkout/confirm.html.twig` prerenders the next page with speculation
rules. Cart and checkout URLs are session-sensitive.

- Remove the `<script type="speculationrules">` block (and any prerender /
  prefetch of checkout, cart, account, or wishlist).
- Leave the rest of the template intact.
