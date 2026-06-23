# Admin API and Store API OpenAPI schemas (core)

Load when adding or changing **core** Admin API or Store API action routes in
shopware/shopware.

## Schema files

When adding core Admin API or Store API action routes, add the matching OpenAPI
JSON schema under:

```text
src/Core/Framework/Api/ApiDefinition/Generator/Schema/<AdminApi|StoreApi>/paths
```

The HTTP route contract can be public even when the PHP controller class is
`@internal` — document route and schema separately from the PHP surface.

## Verification

Run (or ensure CI runs):

```text
tests/integration/Core/Framework/ApiRoutesHaveASchemaTest.php
```

for new or changed core API routes. It catches missing paths, method mismatches,
and stale schema entries.

## Release documentation

When REST/Admin/Store API contracts change, document them in release notes from
the **external consumer’s perspective** — what changed, who is affected, what to
do. If both HTTP contracts and PHP extension points change, use separate entries
(e.g. API vs Core sections) when that prevents migration mistakes.
