# Task: return the note of a created example

This is part of a shopware/shopware checkout. `POST /store-api/example` is
handled by `src/Core/Framework/Api/Example/ExampleRoute.php`.

`ExampleRoute::create()` returns the created example without its note. Fill
the response's `note` from the request. When the client does not send a
`note`, use the default the API schema defines for it.

Composer dependencies are not installed here, so `bin/console` and PHPUnit do
not run.
