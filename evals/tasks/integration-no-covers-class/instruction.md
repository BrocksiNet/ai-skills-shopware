# Task: clean up the product loader integration test

`ProductLoaderIntegrationTest.php` is an integration test for a
shopware/shopware contribution. Bring it in line with core's PHPUnit
conventions before the PR.

- Keep it an integration test (`IntegrationTestBehaviour`, `TestCase`).
- Do not change `ProductLoader.php`.
