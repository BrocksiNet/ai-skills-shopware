This installed 6.7 checkout contains the Kernel::handle implementation shown here, adapted from merged core PR 19121. LONGRUNNING_ENVIRONMENT is disabled unless the deployment enables it before kernel boot. With the flag enabled, the container hides http_cache and Symfony resets registered services before the next main request. There are no runtime flag overrides, no explicit container resets and no Messenger consumer in this task. Each request shares one kernel and one RateMemo. Rates must be refreshed after every request. Review only the newly added HTTP worker deployment; the existing RateMemo service is correctly registered for reset.

The installed feature loader merges this deployment override before boot. There is no environment override disabling it. The HTTP worker already exists; this diff enables its reset lifecycle.

The host provides $requests as a stream of Requests and registers the plugin service before invoking this worker. Bootstrap boilerplate is omitted.
