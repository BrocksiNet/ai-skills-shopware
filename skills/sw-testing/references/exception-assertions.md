# Exception assertions

Inspired by [FriendsOfShopware shopware-phpunit](https://github.com/FriendsOfShopware/agent-skills/tree/main/skills/shopware-phpunit)
(`setup-prefer-expect-exception-object`); rewritten for this repo.

Prefer `expectExceptionObject()` over separate `expectException()` +
`expectExceptionMessage()` when the code throws a Shopware domain exception with
a stable constructor.

```php
// Prefer — one assertion, stays in sync with the exception class
$this->expectExceptionObject(
    AdapterException::invalidArgument('Expected string, stdClass given')
);

// Avoid — message strings drift from the real exception
$this->expectException(AdapterException::class);
$this->expectExceptionMessage('Expected string, stdClass given');
```

For wrapped exceptions (e.g. Twig `RuntimeError` with a previous), rethrow the
previous in the test after asserting it exists — same pattern as core tests.
