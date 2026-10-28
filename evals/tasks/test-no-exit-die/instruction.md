# Task: fix the console command test

`ConsoleCommandTest.php` never reaches its assertion: running it stops the
whole PHPUnit process. Fix the test so it runs to the end.

- Keep running the command through the console application.
- Keep the command name assertion.
