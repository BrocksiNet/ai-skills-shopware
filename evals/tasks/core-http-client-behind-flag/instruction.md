# Task: move RemoteSnippetFetcher to the Symfony HTTP client (core)

You are working on **Shopware core** (`shopware/shopware` trunk) in
`RemoteSnippetFetcher.php`.

We want this service to fetch through Symfony's HTTP client instead of
`file_get_contents`. The change lands in a 6.7 minor release; 6.8.0 is the
next major. Make the change the way core would merge it.

This swap deliberately changes failure behavior: the new path propagates the
HTTP client's exceptions; the legacy path must retain its current exception.
Use the registered `v6.8.0.0` major flag to stage that observable change. Return
the response body, including an empty body, on each path.

Assume the Symfony HTTP client and the Shopware framework classes are
available. Focus on the service class; no release-note files.
