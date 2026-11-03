# Task: answer 201 with a Location header

This is part of a shopware/shopware checkout. `POST /store-api/example` is
handled by `src/Core/Framework/Api/Example/ExampleRoute.php`.

Creating an example must answer `201 Created` instead of `200`, with a
`Location` header `/store-api/example/<name>` (the name URL-encoded). The
response body stays the same.

Composer dependencies are not installed here, so `bin/console` and PHPUnit do
not run.
