# Modernization and compatibility (core)

Load this when refactoring **platform** code that still uses a historic workaround
(hand-rolled HTTP, sync glue, `time()`, custom retry logic) and a **Symfony
component or newer internal service** is available on the Symfony version Shopware
pins.

Plugins follow [`sw-plugin-development/references/symfony-first.md`](../../sw-plugin-development/references/symfony-first.md)
(without the full BC matrix). Core chooses a rollout from the affected contract.

## Decision flow

1. **Confirm the pinned stack** — read `composer.lock` for `symfony/*` and
   `shopware/core`. Do not use APIs from newer Symfony docs than the lockfile.
2. **Separate contract from implementation** — verify results, errors, side
   effects, ordering, configuration and extension points. An equivalent internal
   swap can replace the implementation directly; unchanged signatures alone
   do not prove equivalence. Public API changes need the deprecation cycle
   ([`deprecations.md`](deprecations.md)).
3. **Prefer Symfony (or a new Shopware service) for the new path** when it fits:
   HTTP → `HttpClientInterface`; async → Messenger; time → `ClockInterface`;
   validation → Validator component; IDs → `Uid` where version allows.
4. **Keep Shopware-owned boundaries** — DAL, cache invalidation, indexing, ACL,
   and extension points stay on platform APIs. Symfony lives *inside* services,
   not instead of them.
5. **Choose the rollout** — direct replacement for an equivalent internal swap;
   the registered major flag, such as `Feature::isActive('v6.8.0.0')`, for an
   incompatible change. A deliberate staged rollout also needs a concrete
   removal condition. Keep only the legacy behavior the rollout requires.
6. **Verify** — characterize behavior before a direct swap; test both branches
   while a flagged change retains them, including failure behavior.

## Pattern: observable HTTP failure change behind a major flag

This example deliberately changes exceptions: the legacy path throws
`SnippetException`, while the new path propagates HTTP-client exceptions.
It therefore needs a BC rollout. A swap that preserves the complete contract
does not automatically need this branch.

```php
final class RemoteSnippetFetcher
{
    public function __construct(
        private readonly HttpClientInterface $httpClient,
    ) {
    }

    public function fetch(string $url): string
    {
        if (Feature::isActive('v6.8.0.0')) {
            $response = $this->httpClient->request('GET', $url);

            return $response->getContent();
        }

        $content = @file_get_contents($url);
        if ($content === false) {
            throw SnippetException::remoteFetchFailed($url);
        }

        return $content;
    }
}
```

- Register `HttpClientInterface` in the **owning bundle** only.
- **CORE-027** No silent behavior change: if callers could observe the swap, add
  `@feature-deprecated` / `@deprecated tag:` and `RELEASE_INFO` per
  [`deprecations.md`](deprecations.md).
- **CORE-028** Do **not** copy legacy workarounds into new core code. Replace an
  equivalent internal implementation directly; retain a flagged legacy path
  when an incompatible change or deliberate staged rollout requires it.

## When the public surface must change

| Change | Action |
| ------ | ------ |
| Equivalent internal behavior and extension contracts | Direct replacement + characterization tests; usually no release note |
| Observable incompatible behavior, even with the same signature | Major flag + required legacy behavior + tests for both branches |
| Deliberate staged rollout | Flag + tests for both branches + explicit removal condition |
| New public API alongside old | Add new symbol; deprecate old with `tag:` |
| Breaking replacement | `@major-deprecated`, major flag, `UPGRADE` entry |

## Historic core workarounds

Core may still contain patterns from before a Symfony component existed. For **new
or touched code**:

- Do not extend the workaround “because core does it elsewhere.”
- Migrate the **implementation** you touch; leave unrelated legacy for a follow-up.
- If the whole subsystem should move, propose an ADR + phased changes (see
  `sw-core-development` release/ADR reference).

## Research

Unsure whether Symfony covers the case on your version? Use
`sw-research-and-escalation` (Context7 / `composer.lock`). Symfony blog posts can
identify candidates; verify API availability and behavior against the pinned
source and versioned documentation before applying them.

## Done

- [ ] Pinned Symfony/Shopware versions checked (`composer.lock`).
- [ ] New implementation uses Symfony or a documented platform service; rollout follows the affected contract.
- [ ] Public API / deprecation / release docs handled per [`deprecations.md`](deprecations.md).
- [ ] Tests preserve the contract for a direct swap, or cover flag on and flag off for a flagged change.
- [ ] No new copy of a deprecated platform pattern without a migration plan.
