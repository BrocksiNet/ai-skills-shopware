# Task: check the plugin against its whole Shopware range

We are about to tag version 2.1.0 of this plugin. Its `composer.json`
allows `shopware/core: ~6.6.0 || ~6.7.0`, and some merchants still run
early 6.6 patch releases.

Check that the plugin works on every Shopware release that range allows,
and fix what does not. Keep 6.6 support and keep digital goods out of the
shipping cost wherever the shop's Shopware can do it. In your answer, name
the exact release each problem starts or ends at.
