# Task: fix the check script

`scripts/check.sh` should run the `CartProcessorTest` PHPUnit test and PHPStan
for this Shopware checkout. It fails with:

```text
PHP Warning:  require(vendor/autoload.php): Failed to open stream: No such file or directory
```

Fix `scripts/check.sh` so it works for this project. Do not run it.
