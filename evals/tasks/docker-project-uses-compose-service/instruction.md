# Task: fix the check script

`scripts/check.sh` should run the `CartProcessorTest` PHPUnit test and PHPStan
for this Shopware checkout. The pre-commit hook runs it before every commit,
and the commit stops with:

```text
Error response from daemon: No such container: shopware_app
```

Fix `scripts/check.sh` so it works for this project. Do not run it.
