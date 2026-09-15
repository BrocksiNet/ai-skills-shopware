# Task: drop the legacy storefront CSRF field

`login.html.twig` still calls `sw_csrf`. Shopware 6.5+ dropped storefront
CSRF for SameSite cookies.

- Remove `sw_csrf` and any CSRF hidden field.
- Keep the form posting to `frontend.account.login` with the email field
  and submit button.
