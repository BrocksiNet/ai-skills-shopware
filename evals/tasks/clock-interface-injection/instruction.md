# Task: inject ClockInterface (PSR-20)

Refactor `TokenExpiryChecker.php` so it **does not call `time()` or `date()`**.
Inject `Psr\Clock\ClockInterface` and use the clock for the expiry comparison.

Keep the same behaviour: expired when `now >= issuedAt + ttlSeconds`.

Do not add tests unless you need them; focus on the production class only.
