# Testing the generator

Load when you change the generator, its parser or renderer, or its tests.

Generator regression cases live in
`tests/unit/Core/Framework/Api/OpenApi/_fixtures/`. Each case pairs a schema
JSON with the PHP it must generate. `OpenApiDtoGeneratorTest` generates
every fixture and compares the complete output and file list, with the
timestamp normalized. The HTTP behavior is covered by
`tests/integration/Core/Framework/Api/OpenApi/OpenApiDtoTest.php`.

## Rule

- **DTO-008** A generator behavior change gets its own fixture directory
  `_fixtures/<scenario>/`, or extends the closest existing one: a complete
  OpenAPI document plus every generated PHP file beside it. Write the
  expected PHP with `bin/console open-api:generate-dtos`, never by hand.
  Do not replace the full comparison with assertions on single properties or
  source strings, do not inline schemas in PHP tests, and do not build a
  scenario by changing another fixture at runtime. Invalid schemas go under
  `_fixtures/invalidSchemas/` with an explicit exception assertion.

Add a separate parser or renderer test only for a failure the full
comparison cannot show. Fix a stale fixture; never drop it from the cases.

## Checks to run

```bash
bin/console open-api:generate-dtos --check
bin/console lint:container
vendor/bin/phpunit tests/unit/Core/Framework/Api/OpenApi
vendor/bin/phpunit tests/unit/Core/Framework/Api/AbstractDtoTest.php
vendor/bin/phpunit tests/integration/Core/Framework/Api/OpenApi/OpenApiDtoTest.php
```

The integration test needs the normal Shopware test database.
