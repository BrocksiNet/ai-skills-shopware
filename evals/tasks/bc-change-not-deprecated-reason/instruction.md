# Task: plan a parameter narrowing with a BC-change attribute

`LegacyIdLoader.php` uses `@deprecated reason:*` to announce that `$id` will
become `string` in v6.8.0. That planning marker is rejected on trunk.

- Add `#[ParameterTypeNarrowing(version: 'v6.8.0', parameterName: 'id', newType: 'string')]`
  from `Shopware\Core\Framework\Deprecation\BCChange`.
- Remove the `@deprecated reason:*` annotation.
- Keep the current `string|int $id` signature callable.
