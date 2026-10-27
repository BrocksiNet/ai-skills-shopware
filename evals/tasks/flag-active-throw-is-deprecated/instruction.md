# Task: prepare the flag test for 6.9

`FlagThrowTest::testThrowsWhenMajorActive` is a shopware/shopware unit test.
It asserts behaviour that only exists while the major flag `v6.9.0.0` is
active, so it has to go when the flag is removed.

Make sure the 6.9 cleanup catches this test, the way core tracks code that
goes away with a major. Do not change what the test asserts.
