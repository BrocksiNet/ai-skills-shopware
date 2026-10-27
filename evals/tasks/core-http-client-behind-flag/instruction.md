# Task: move RemoteSnippetFetcher to the Symfony HTTP client (core)

You are working on **Shopware core** (`shopware/shopware` trunk) in
`RemoteSnippetFetcher.php`.

We want this service to fetch through Symfony's HTTP client instead of
`file_get_contents`. The change lands in a 6.7 minor release; 6.8.0 is the
next major. Make the change the way core would merge it.

Assume the Symfony HTTP client and the Shopware framework classes are
available. Focus on the service class; no release-note files.
