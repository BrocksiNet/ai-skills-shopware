# Task: fix the product repository test setup

`ProductRepositoryTest` is a shopware/shopware integration test. It needs the
service container, and it will write products through the repository, so its
database changes must be rolled back after each test. It does not touch the
sales channel, the HTTP cache or the request stack.

Core review flagged the test's setup. Fix it.
