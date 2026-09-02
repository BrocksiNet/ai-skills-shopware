# Task: keep listing HTML cacheable

`listing-price.plugin.js` runs on the product listing and fetches
personalized prices with `cache: 'no-store'`. That poisons shared HTML
or blocks first paint.

- Remove the blocking `no-store` fetch from the listing plugin.
- Personalized data may load after first paint; do not put `no-store` on
  the shared listing document.
- Keep the Plugin subclass.
