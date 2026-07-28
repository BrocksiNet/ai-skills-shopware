# Progressive enhancement (BC-safe rollout)

Load when modernizing or decoupling without breaking extensions.

## When to use

- Replacing a historic workaround (sync HTTP, `time()`, custom retry) with Symfony
  or a new internal service.
- Extracting logic so a component becomes more independent.
- Any change where **callers or plugins might observe** different behaviour.

## Steps

1. **Classify the change**
   - *Internal only* — same public method signatures; swap implementation.
   - *Public contract* — new symbol + deprecate old, or major-only break.

2. **Internal swap pattern**
   - Inject the new dependency (e.g. `HttpClientInterface`, `ClockInterface`).
   - Gate the new path with `Feature::isActive('v6.x.0')` (major flag from the
     deprecation doc).
   - **Keep the legacy branch** until the major removes the flag.
   - Register services in the **owning bundle** only.

3. **Test both paths** until the flag is default — unit for branches; integration
   when container wiring matters.

4. **Document**
   - Silent internal swap: usually no release note.
   - Observable change: `RELEASE_INFO` + `@deprecated tag:` per
     `shopware-core-development` → deprecations reference.

5. **Phasing**
   - One PR: extract interface + dual path for the code you touch.
   - Follow-up PRs: migrate callers, delete legacy when flag goes default.
   - Subsystem-wide rewrites: propose an **ADR** + multiple flagged steps.

## Anti-patterns

- Deleting the old path in the same PR as the new path (on core).
- Changing behaviour without flag when extensions decorate or subscribe to the old flow.
- Copying the legacy workaround into new code “because it is easier.”

## Core detail

See `shopware-core-development` → `modernization-and-flags.md` for a full
HttpClient swap example and PHPStan/release-note pairing.
