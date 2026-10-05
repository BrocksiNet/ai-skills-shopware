# shopware-architecture — should trigger

- Decouple ProductListingLoader from Storefront — make core components more independent.
- Refactor this service with progressive enhancement and keep backwards compatibility.
- Should I use an event or decoration for this extension point?
- Should this be an event, a decoration, or a core edit?
- These session features keep working today and fail silently when the session is gone. Is this the right shape?
- We are introducing a new way for extensions to plug into this flow. What structure should they follow?
- This cart change might break the existing calculation path without the diff saying so.
- New core Store API route: extension event or a new abstract route class?
- This repository search has no limit — fix the Criteria usage.
- We are reaching into DAL internals — is there a public API instead?
- Choose the Symfony component for outbound HTTP in this Shopware service.
- Dual path behind a feature flag for modernizing this fetcher.
