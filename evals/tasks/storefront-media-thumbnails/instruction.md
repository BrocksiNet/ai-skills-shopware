# Task: use Shopware media thumbnails for the product cover

`product-box.html.twig` hardcodes a CDN `<img>` URL for the product cover.

- Render the cover through Shopware media / thumbnail helpers
  (`sw_thumbnails`, or the media URL with `srcset`).
- Do not leave `https://cdn.example/product.jpg` in the template.
- Keep the existing product-box block; this is not a new image pipeline.
