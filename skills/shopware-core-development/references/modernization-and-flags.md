# Modernization behind feature flags (core)

Load this when refactoring **platform** code that still uses a historic workaround
(hand-rolled HTTP, sync glue, `time()`, custom retry logic) and a **Symfony
component or newer internal service** is available on the Symfony version Shopware
pins.

Plugins follow [`shopware-plugin-development/references/symfony-first.md`](../../shopware-plugin-development/references/symfony-first.md)
(without the full BC matrix). **Core must keep both paths** until the major.

## Decision flow

1. **Confirm the pinned stack** — read `composer.lock` for `symfony/*` and
   `shopware/core`. Do not use APIs from newer Symfony docs than the lockfile.
2. **Separate contract from implementation** — can you change internals only?
   Prefer that. Public API changes need the deprecation cycle
   ([`deprecations.md`](deprecations.md)).
3. **Prefer Symfony (or a new Shopware service) for the new path** when it fits:
   HTTP → `HttpClientInterface`; async → Messenger; time → `ClockInterface`;
   validation → Validator component; IDs → `Uid` where version allows.
4. **Keep Shopware-owned boundaries** — DAL, cache invalidation, indexing, ACL,
   and extension points stay on platform APIs. Symfony lives *inside* services,
   not instead of them.
5. **Gate the new path** with `Feature::isActive('v6.x.0')` (or the major flag
   from the deprecation doc). Old path stays until the major removes it.
6. **Test both paths** until the flag becomes default and the old path is deleted.

## Pattern: internal swap behind a flag

```php
final class RemoteSnippetFetcher
{
    public function __construct(
        private readonly HttpClientInterface $httpClient,
    ) {
    }

    public function fetch(string $url): string
    {
        if (Feature::isActive('v6.8.0')) {
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
- No silent behavior change: if callers could observe the swap, add
  `@feature-deprecated` / `@deprecated tag:` and `RELEASE_INFO` per
  [`deprecations.md`](deprecations.md).
- Do **not** copy legacy workarounds into new core code — add the modern path and
  flag; delete the old path only in the major.

## When the public surface must change

| Change | Action |
| ------ | ------ |
| Internal only, same public method | Flag + tests for both branches; usually no release note |
| New public API alongside old | Add new symbol; deprecate old with `tag:` |
| Breaking replacement | `@major-deprecated`, major flag, `UPGRADE` entry |

## Historic core workarounds

Core may still contain patterns from before a Symfony component existed. For **new
or touched code**:

- Do not extend the workaround “because core does it elsewhere.”
- Migrate the **implementation** you touch; leave unrelated legacy for a follow-up.
- If the whole subsystem should move, propose an ADR + phased flags (see
  `shopware-core-development` release/ADR reference).

## Research

Unsure whether Symfony covers the case on your version? Use
`shopware-research-and-escalation` (Context7 / `composer.lock`), not generic
Symfony blog posts.

## Done

- [ ] Pinned Symfony/Shopware versions checked (`composer.lock`).
- [ ] New path uses Symfony or a documented platform service; old path kept behind `Feature::isActive`.
- [ ] Public API / deprecation / release docs handled per [`deprecations.md`](deprecations.md).
- [ ] Tests cover flag on and flag off (or documented why one path is untestable).
- [ ] No new copy of a deprecated platform pattern without a migration plan.
