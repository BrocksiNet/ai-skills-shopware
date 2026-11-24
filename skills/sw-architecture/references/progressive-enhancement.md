# Progressive enhancement (BC-safe rollout)

Load when modernizing or decoupling without breaking extensions.

## When to use

- Replacing a historic workaround (sync HTTP, `time()`, custom retry) with Symfony
  or a new internal service.
- Extracting logic so a component becomes more independent.
- Any change where **callers or plugins might observe** different behaviour.

## Steps

1. **Classify observable behavior and extension contracts**
   - *Equivalent internal swap* — preserve results, errors, side effects,
     ordering, configuration and supported extension points; replace directly.
     Matching method signatures alone does not prove equivalence.
   - *Incompatible change* — retain current behavior until the deprecation cycle
     completes; introduce the new behavior behind the relevant major flag.
   - *Deliberate staged rollout* — keep both paths only for the rollout that
     needs them, with an explicit condition for removing the old path.

2. **Implement the chosen path**
   - Inject the new dependency (e.g. `HttpClientInterface`, `ClockInterface`).
   - For an incompatible change, use the registered four-part flag ID, such as
     `Feature::isActive('v6.8.0.0')`, and keep the required legacy branch until
     the major. Release labels such as `v6.8.0` are for deprecation tags and
     `BCChange` attributes, not feature checks.
   - Register services in the **owning bundle** only.

3. **Verify the contract** — characterization tests for a direct swap; both paths
   for a flagged change; integration when container wiring matters.

4. **Document**
   - Equivalent internal swap: usually no release note.
   - Public removal or replacement: `RELEASE_INFO` + deprecation cycle per
     `sw-core-development` → deprecations reference.

5. **Phasing**
   - Keep equivalent cleanups local; introduce an interface only when it models
     a useful boundary.
   - For incompatible changes, migrate callers and delete legacy after the BC
     period; record the removal condition for staged rollouts.
   - Subsystem-wide rewrites: propose an **ADR** + phased changes.

## Anti-patterns

- Keeping dual implementations for a proven equivalent internal cleanup.
- Deleting a legacy path still required for compatibility.
- Changing behaviour without flag when extensions decorate or subscribe to the old flow.
- Copying the legacy workaround into new code “because it is easier.”

## Core detail

See `sw-core-development` → `modernization-and-flags.md` for a full
HttpClient swap example and PHPStan/release-note pairing.
