# Schema first: what generates a DTO

Load when you add or change an operation or component that generates DTOs,
or when you touch a generated DTO file.

## Where schemas live

The generator reads `AdminApi` and `StoreApi` separately from
`src/Core/Framework/Api/ApiDefinition/Generator/Schema/`. It reads these
directories directly, not the merged schema a running shop serves. Use
OpenAPI `3.2.0` for complete schema documents and test fixtures.

An operation generates DTOs only when it has both `operationId` and
`x-dto-namespace`. The names come from the PascalCase `operationId` plus
`Request` or `Response`: `createExample` gives `CreateExampleRequest` and
`CreateExampleResponse`.

| Key | Effect |
| --- | ------ |
| `x-dto-namespace` | Namespace and folder. `Shopware\` maps to `src/`; other Composer PSR-4 roots are not resolved. |
| `x-dto-package` | Value of the generated `#[Package(...)]` attribute. |
| `x-dto-namespace` on a component | The component gets its own class in that namespace and can be reused across operations. |
| `x-dto-inline: true` on a component | The fragment is flattened into every DTO that references it, with no class of its own. |

Only the first numeric `2xx` response generates a response DTO. Error
responses get no DTO. A response with no properties generates nothing.

## Rules

- **DTO-001** A DTO shape change goes into the schema JSON, then
  `bin/console open-api:generate-dtos` writes the PHP. Never add, remove or
  retype a property in a generated file by hand; the header says
  "This file is auto-generated", and CI runs `open-api:generate-dtos --check`,
  which fails on any difference. Commit the schema and the generated PHP
  together. When you cannot run the command, change the schema anyway and
  tell the user to run it; do not hand-write the PHP as a stand-in.
- **DTO-002** The generator never deletes a file, and `--check` does not
  report a DTO nothing generates any more. When you remove or rename an
  operation, rename its `operationId`, move its `x-dto-namespace` or drop
  that key, delete the old DTO files and their imports yourself.

The general rule against editing generated files is `CORE-004` in
`sw-core-development`; `DTO-001` adds what to change instead.

## Example operation

Inside an existing Store API path document:

```json
"/example": {
  "post": {
    "operationId": "createExample",
    "x-dto-namespace": "Shopware\\Core\\Framework\\Api\\Example",
    "x-dto-package": "framework",
    "requestBody": {
      "required": true,
      "content": { "application/json": { "schema": {
        "type": "object",
        "required": ["name"],
        "properties": {
          "name": { "type": "string", "minLength": 1 },
          "note": { "type": ["string", "null"], "default": null }
        }
      } } }
    },
    "responses": { "200": { "description": "Created example", "content": {
      "application/json": { "schema": {
        "type": "object",
        "required": ["name"],
        "properties": { "name": { "type": "string" }, "note": { "type": ["string", "null"] } }
      } } } } }
  }
}
```

A real endpoint still needs its tags, authentication and error responses
(`CORE-008`).
