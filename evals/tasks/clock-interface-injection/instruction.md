# Task: inject ClockInterface (PSR-20)

Refactor `TokenExpiryChecker.php` so it **does not call `time()` or `date()`**.
Inject `Psr\Clock\ClockInterface` and use the clock for the expiry comparison.

This is an internal Shopware core implementation cleanup. Its public behavior
and extension contracts stay the same, so replace the implementation directly;
there is no feature rollout or legacy branch to retain.

Keep the same behaviour: expired when `now >= issuedAt + ttlSeconds`.

Do not add tests unless you need them; focus on the production class only.
