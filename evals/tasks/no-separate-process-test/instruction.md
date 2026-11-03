# Task: unit tests for the telemetry opt-out

You are working on shopware/shopware core.
`src/Core/Framework/Telemetry/TelemetryOptOut.php` decides whether the shop
sends usage telemetry, and it has no tests yet.

Add a unit test under `tests/unit/` that covers three cases:

- the variable is not set: not opted out
- `SHOPWARE_TELEMETRY_OPT_OUT=1` in the process environment: opted out
- `$_SERVER['SHOPWARE_TELEMETRY_OPT_OUT'] = 'true'`: opted out

CI runs the unit suite in random order, so every test must pass on its own
and in any order with the rest of the suite.
