# Task: modernize HTTP fetch behind a feature flag (core)

You are changing **Shopware platform** code in `RemoteSnippetFetcher.php`.

Refactor the fetch logic so that:

1. When `Feature::isActive('v6.8.0')` is **true**, use
   `Symfony\Contracts\HttpClient\HttpClientInterface` (inject via constructor).
2. When the flag is **false**, keep the existing `file_get_contents` behavior
   (same failure semantics).
3. Do **not** remove the legacy path — core keeps both until the major.
4. Inject dependencies via the constructor; no static calls for the new path.

Assume `Shopware\Core\Framework\Feature` and `HttpClientInterface` are available.
Do not add release-note files unless the task requires it; focus on the service class.
