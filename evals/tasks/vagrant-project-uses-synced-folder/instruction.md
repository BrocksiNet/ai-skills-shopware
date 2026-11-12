# Task: fix the check script

`scripts/check.sh` should run the `CartProcessorTest` PHPUnit test and PHPStan
for this Shopware checkout, on the code as it is on disk now. It fails with:

```text
Could not open input file: vendor/bin/phpunit
```

Fix `scripts/check.sh` so it works for this project. Do not run it.
