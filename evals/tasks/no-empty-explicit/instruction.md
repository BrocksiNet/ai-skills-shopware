# Task: remove empty()

Refactor `fixture/UserValidator.php` so it **does not use `empty()`**. Use explicit
checks instead (`=== null`, `=== ''`, or separate guards) while keeping the same
behaviour for null, empty string, and valid emails.

Do not add tests unless you need them; focus on the production class only.
