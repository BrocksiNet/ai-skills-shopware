# Task: do not exit from a console test

`ConsoleCommandTest.php` calls `Application::run()` and then `exit()`.
That kills PHPUnit.

- Call `$application->setAutoExit(false)` before `run()`.
- Remove `exit()` and `die()`.
- Keep the command name assertion.
