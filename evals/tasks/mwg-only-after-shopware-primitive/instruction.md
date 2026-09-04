# Task: keep the Shopware modal; do not install MWG as a skill

`product-card.html.twig` replaced the storefront Bootstrap modal with a
native `<dialog>`. Shopware already owns that primitive.

- Restore a Bootstrap storefront modal (`data-bs-toggle="modal"` or
  `js-modal`).
- Do not leave `<dialog>`, `showModal(`, or the Popover API.
- Do not add a `modern-web-guidance` `SKILL.md`. Look up MWG only after
  Shopware has no component for the job.
