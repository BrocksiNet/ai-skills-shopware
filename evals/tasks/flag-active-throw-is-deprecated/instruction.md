# Task: flag-active throw test is deprecated on the method

`FlagThrowTest::testThrowsWhenMajorActive` asserts that the behavior throws
while major flag `v6.9.0.0` is active. That assertion is temporary.

Mark **that test method** `@deprecated tag:v6.9.0` and state that it is
removed with the feature flag. A class-level tag is not enough.
