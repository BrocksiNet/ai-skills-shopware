# Task: unit tests for the telemetry opt-out

You are working on shopware/shopware core.
`src/Core/Framework/Telemetry/TelemetryOptOut.php` decides whether the shop
sends usage telemetry, and it has no tests yet. It also runs in the
installer before the kernel boots, so it stays a static helper.

Add a unit test next to the existing telemetry tests in
`tests/unit/Core/Framework/Telemetry/` that covers four cases:

- the variable is not set: not opted out
- `SHOPWARE_TELEMETRY_OPT_OUT=1` in the process environment: opted out
- `$_SERVER['SHOPWARE_TELEMETRY_OPT_OUT'] = 'true'`: opted out
- the decision is made once: after the first call, changing the variable
  does not change the answer

CI runs the unit suite in random order, so every test must pass on its own
and in any order with the rest of the suite.
