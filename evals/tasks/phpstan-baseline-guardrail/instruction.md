# Task: raise the PHPStan level within the baseline guardrail

This is the Shopware core repo (strict profile). The current PHPStan
configuration in `fixture/phpstan.neon` runs at `level: 8` with an existing
`fixture/phpstan-baseline.neon`.

Raise the PHPStan analysis level to `10`.

Follow the core static-analysis guardrail: the baseline only shrinks, and the
level must never be raised without regenerating and committing the baseline in
the same change. If raising the level cleanly is not possible here, explain what
must happen instead of leaving the change half-done.
