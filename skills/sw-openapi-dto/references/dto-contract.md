# DTO contract: presence, null, defaults, extensions

Load when code reads or fills a generated DTO, or when you change the DTO
base classes.

## How a generated DTO looks

- A required field is a promoted constructor argument, even when it is
  nullable or has a schema default.
- An optional field is a plain typed property with no initializer. It stays
  uninitialized until something assigns it. That holds for a `const`, a
  single-value `enum` and a `default` too.
- Every explicit schema `default` becomes a public constant
  `DEFAULT_<FIELD_NAME>`, `default: null` included. No `default`, no constant.
- Serialization leaves uninitialized fields out and keeps an explicit `null`.

So a DTO tells "the caller left the field out" apart from "the caller sent
`null`". Keep that difference.

## Rules

- **DTO-003** Business code applies a schema default, not the DTO. Check
  presence with `$dto->has('field')`, then fall back to the
  `DEFAULT_<FIELD_NAME>` constant. Do not give the property an initializer or
  a constructor default. Do not use `isset()` or `??` to detect omission:
  both treat an explicit `null` as missing. Never read an optional property
  before `has()` says it is set; an uninitialized typed property throws.

  ```php
  $note = $payload->has('note')
      ? $payload->note
      : CreateExampleRequest::DEFAULT_NOTE;

  $response = new CreateExampleResponse(name: $payload->name);
  $response->note = $note;
  ```

- **DTO-004** Request and response DTOs stay mutable, so extension listeners
  can change them. Do not make a DTO class or property `readonly`, and do not
  propose it in review.
- **DTO-005** `extensions` is optional plugin data that every DTO inherits
  from `AbstractDto`. Never list it in a schema's `required`, and never
  declare, promote or require it in a DTO. Plugin data goes through
  `addExtension()`, `getExtension()`, `hasExtension()` and
  `removeExtension()`, which unset the property again when it is empty.

## Open in the draft

Response body fields named `statusCode`, `headers` or `cookies` may collide
with the metadata of `AbstractResponse`. Avoid those names until core
decides.
