# Task: keep listing HTML cacheable

`ListingPageController.php` sends the shared listing document with
`Cache-Control: no-store`. The plugin still needs a private price fetch
after first paint.

- Remove `no-store` from the listing **document** response.
- Keep the Plugin subclass and its `fetch()` of personalized prices.
  `fetch({ cache: 'no-store' })` on that private request is allowed.
- Do not delete the personalized pricing call.
