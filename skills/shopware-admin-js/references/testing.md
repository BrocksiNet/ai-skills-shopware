# Administration Jest

Load when writing or moving Admin unit/component tests.

- New TypeScript: `*.spec.ts` next to the file under test.
- Split 500+ line specs into a `*.spec/` directory, one file per behavior
  group (see core ADR on splitting large Administration tests).
- Test behavior, not Vue internals.
- Prefer `shallowMount` unless child rendering is the behavior.
- Clean up mounted wrappers in `afterEach()`.
- `flushPromises()` after async UI or repository work.
- Keep setup small and scenario-specific. Use existing Admin helpers/mocks
  for repositories, services, ACL, and feature flags.
- Register globally available framework components (for example `sw-block`)
  in `test/_setup/prepare_environment.js` via `config.global.stubs` with the
  real implementation — not `config.global.components`. Vue Test Utils
  skips `app.component()` for any key that also appears in `stubs`.
- Cover error paths for API services and save/load flows.
- Feature-flagged Jest: follow the current Admin ADR for flag helpers; do
  not invent a local `FEATURE_NEXT` stub.
