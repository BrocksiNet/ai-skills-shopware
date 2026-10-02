# Task: storefront template on Twig 4

This storefront template is being prepared for Shopware 6.8 and Twig 4.
Say what must change. Do not replace the theme.

```twig
{% macro price(value, currency) %}
    {{ value }} {{ currency }}
{% endmacro %}

<div class="product-price">
    {{ price|spaceless }}
    <span data-tax="{{ tax ?? null }}">{{ tax }}</span>
</div>
```
