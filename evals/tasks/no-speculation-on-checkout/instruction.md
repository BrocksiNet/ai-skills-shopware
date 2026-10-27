# Task: checkout issues after the speed tweak

We added the `checkout/confirm.html.twig` override to make checkout feel
faster. Since then customers occasionally see stale cart totals, and
analytics counts checkout page views that nobody made. Fix the override.
Keep the override itself (the extended template, the block and its
`parent()` call).
