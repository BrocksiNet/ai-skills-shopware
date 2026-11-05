# Task: release check for the storefront templates

We are about to tag 2.0.0 of this plugin. Its `composer.json` allows
`shopware/storefront: ~6.6.0 || ~6.7.0`, and we have merchants on every
6.6 and 6.7 patch release.

The plugin does two things in the storefront: a delivery hint on the
customer's address book page, and a truck icon on the cart's shipping cost
toggle. Check that both still work on every Shopware release the range
allows, and fix what does not. Keep 6.6 support.

Before we tag, give me a short risk report: for each problem, the exact
release it starts at, how a merchant or a customer would notice it, and
whether 2.0.0 can ship without the fix.
