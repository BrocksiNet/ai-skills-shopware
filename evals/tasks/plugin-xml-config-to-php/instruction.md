# Task: move plugin Symfony DI from XML to PHP

This 6.8-targeted plugin still registers `ProductLoader` in
`Resources/config/services.xml`. Shopware 6.8 drops Symfony XML loaders.

- Replace `services.xml` with `services.php` using
  `ContainerConfigurator` and register `ProductLoader` there.
- Delete `services.xml`. Keep `config.xml` (plugin admin settings stay XML).
- Do not leave the service only in a comment.
