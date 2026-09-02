# Task: override a Twig block and use a snippet

`buy-widget.html.twig` is a copied storefront template with hardcoded
"Add to cart" copy.

- `sw_extends` the core buy-widget template.
- Override only `{% block page_product_detail_buy_button %}`.
- Move the visible string to `{{ 'swag-example.addToCart'|trans }}`.
- Do not copy the rest of the core template.
