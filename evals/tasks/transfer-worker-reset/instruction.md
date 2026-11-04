# Task: maintain this Shopware extension

ChannelRateMemo is a shared plugin service used by a long-running Messenger consumer. Its cache should avoid repeated provider calls within a message, but prices are refreshed between messages and must not remain stale in the next one. Make the memo participate in the container's reset lifecycle. Preserve the rate(channelId, currencyId) API, its memoization, its two-part cache key, and the service registration. Work in src/Service/ChannelRateMemo.php and src/Resources/config/services.xml. The project uses service autoconfiguration; do not add a PHP runtime or dependencies.

Implement the change in the provided files. Use local guidance when useful. Summarize what you changed and what you verified.
