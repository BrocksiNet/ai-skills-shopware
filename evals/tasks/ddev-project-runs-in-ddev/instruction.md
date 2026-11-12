# Task: fix the check script

`scripts/check.sh` should run the `CartProcessorTest` PHPUnit test and PHPStan
for this Shopware checkout. It fails with:

```text
SQLSTATE[HY000] [2002] php_network_getaddresses: getaddrinfo for db failed: nodename nor servname provided, or not known
```

Fix `scripts/check.sh` so it works for this project. Do not run it.
