# Task: accept a note when a Store API client creates an example

This is part of a shopware/shopware checkout. `POST /store-api/example` is
handled by `src/Core/Framework/Api/Example/ExampleRoute.php`.

Store API clients need to send an optional free-text `note` (a string, or
`null`) when they create an example. Make the request accept it. The response
stays as it is.

Composer dependencies are not installed here, so `bin/console` and PHPUnit do
not run.
