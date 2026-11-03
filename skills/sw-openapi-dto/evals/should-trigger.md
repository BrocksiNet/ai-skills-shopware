# sw-openapi-dto — should trigger

- Add an optional `note` field to the createExample request DTO in core.
- This operation has x-dto-namespace. Where do the generated Request and Response classes end up?
- bin/console open-api:generate-dtos --check fails in CI. What do I change?
- How do I fall back to the schema default when the client leaves a field out of the generated request DTO?
- Return 201 and a Location header from a core route that returns a generated response DTO.
- I renamed the operationId of a Store API operation with x-dto-namespace. What else do I clean up?
- Add a generator fixture for nullable enums under tests/unit/Core/Framework/Api/OpenApi/_fixtures.
